import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type FolderNode = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  documentCount: number;
  children: FolderNode[];
};

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLibrary(tenantId: string) {
    const [folders, categoryCounts, totalDocuments, pinned] = await Promise.all([
      this.prisma.documentFolder.findMany({
        where: { tenantId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { documents: true } } },
      }),
      this.prisma.document.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.document.count({ where: { tenantId } }),
      this.prisma.document.count({ where: { tenantId, isPinned: true } }),
    ]);

    return {
      success: true,
      data: {
        folderTree: this.buildFolderTree(folders),
        folders: folders.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          icon: f.icon,
          parentId: f.parentId,
          documentCount: f._count.documents,
        })),
        categories: categoryCounts.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        stats: { totalDocuments, pinned, folderCount: folders.length },
      },
    };
  }

  async listDocuments(
    tenantId: string,
    query: {
      folderId?: string;
      category?: DocumentCategory;
      incidentId?: string;
      search?: string;
      pinnedOnly?: boolean;
    },
  ) {
    const documents = await this.prisma.document.findMany({
      where: {
        tenantId,
        ...(query.folderId ? { folderId: query.folderId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.incidentId ? { incidentId: query.incidentId } : {}),
        ...(query.pinnedOnly ? { isPinned: true } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
                { fileName: { contains: query.search, mode: 'insensitive' } },
                { tags: { has: query.search } },
              ],
            }
          : {}),
      },
      include: {
        folder: { select: { id: true, name: true } },
        incident: {
          select: { id: true, type: true, title: true, address: true, status: true },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    return {
      success: true,
      data: documents.map((d) => this.formatDocument(d)),
    };
  }

  async getDocument(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        folder: { select: { id: true, name: true } },
        incident: {
          select: {
            id: true,
            type: true,
            title: true,
            address: true,
            status: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return {
      success: true,
      data: {
        ...this.formatDocument(doc),
        incidentClient: doc.incident
          ? `${doc.incident.user.firstName} ${doc.incident.user.lastName}`
          : null,
      },
    };
  }

  async createFolder(
    tenantId: string,
    body: { name: string; description?: string; parentId?: string; icon?: string },
  ) {
    const folder = await this.prisma.documentFolder.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        parentId: body.parentId,
        icon: body.icon ?? 'folder',
      },
    });
    return { success: true, data: folder };
  }

  async createDocument(
    tenantId: string,
    uploader: string,
    body: {
      title: string;
      description?: string;
      category?: DocumentCategory;
      folderId?: string;
      incidentId?: string;
      fileName: string;
      fileType: string;
      fileUrl?: string;
      fileSizeKb?: number;
      tags?: string[];
      isPinned?: boolean;
    },
  ) {
    if (body.incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: body.incidentId, tenantId },
      });
      if (!incident) throw new NotFoundException('Incident not found');
    }

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        category: body.category ?? 'OTHER',
        folderId: body.folderId,
        incidentId: body.incidentId,
        fileName: body.fileName,
        fileType: body.fileType,
        fileUrl: body.fileUrl ?? `/documents/${body.fileName}`,
        fileSizeKb: body.fileSizeKb,
        tags: body.tags ?? [],
        uploadedBy: uploader,
        isPinned: body.isPinned ?? false,
      },
      include: {
        folder: { select: { id: true, name: true } },
        incident: { select: { id: true, type: true, title: true, address: true, status: true } },
      },
    });

    return { success: true, data: this.formatDocument(doc) };
  }

  async updateDocument(
    tenantId: string,
    id: string,
    body: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      folderId?: string | null;
      incidentId?: string | null;
      tags?: string[];
      isPinned?: boolean;
    },
  ) {
    const existing = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Document not found');

    if (body.incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: body.incidentId, tenantId },
      });
      if (!incident) throw new NotFoundException('Incident not found');
    }

    const doc = await this.prisma.document.update({
      where: { id },
      data: body,
      include: {
        folder: { select: { id: true, name: true } },
        incident: { select: { id: true, type: true, title: true, address: true, status: true } },
      },
    });

    return { success: true, data: this.formatDocument(doc) };
  }

  async linkToIncident(tenantId: string, documentId: string, incidentId: string | null) {
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');

    if (incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: incidentId, tenantId },
      });
      if (!incident) throw new NotFoundException('Incident not found');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { incidentId },
      include: {
        folder: { select: { id: true, name: true } },
        incident: { select: { id: true, type: true, title: true, address: true, status: true } },
      },
    });

    return { success: true, data: this.formatDocument(updated) };
  }

  async deleteDocument(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.document.delete({ where: { id } });
    return { success: true, data: { deleted: true } };
  }

  async listIncidentsForLink(tenantId: string) {
    const incidents = await this.prisma.incident.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        address: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
        _count: { select: { documents: true } },
      },
    });

    return {
      success: true,
      data: incidents.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        status: i.status,
        address: i.address,
        client: `${i.user.firstName} ${i.user.lastName}`,
        documentCount: i._count.documents,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }

  private buildFolderTree(
    folders: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      parentId: string | null;
      _count: { documents: number };
    }[],
  ): FolderNode[] {
    const map = new Map<string, FolderNode>();
    for (const f of folders) {
      map.set(f.id, {
        id: f.id,
        name: f.name,
        description: f.description,
        icon: f.icon,
        parentId: f.parentId,
        documentCount: f._count.documents,
        children: [],
      });
    }
    const roots: FolderNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private formatDocument(doc: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSizeKb: number | null;
    tags: string[];
    uploadedBy: string | null;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
    folderId: string | null;
    incidentId: string | null;
    folder?: { id: string; name: string } | null;
    incident?: {
      id: string;
      type: string;
      title: string | null;
      address: string | null;
      status: string;
    } | null;
  }) {
    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileUrl: doc.fileUrl,
      fileSizeKb: doc.fileSizeKb,
      tags: doc.tags,
      uploadedBy: doc.uploadedBy,
      isPinned: doc.isPinned,
      folderId: doc.folderId,
      incidentId: doc.incidentId,
      folder: doc.folder,
      incident: doc.incident
        ? {
            id: doc.incident.id,
            type: doc.incident.type,
            title: doc.incident.title,
            address: doc.incident.address,
            status: doc.incident.status,
          }
        : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
