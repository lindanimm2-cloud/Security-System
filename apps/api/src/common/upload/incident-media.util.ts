import { BadRequestException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../../database/prisma.service';

export type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export const INCIDENT_UPLOAD_ROOT = join(process.cwd(), 'uploads', 'incidents');
export const MAX_INCIDENT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_INCIDENT_FILES = 8;

const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
]);

export function assertIncidentFilesAllowed(files: UploadedFile[]) {
  if (files.length > MAX_INCIDENT_FILES) {
    throw new BadRequestException(`Maximum ${MAX_INCIDENT_FILES} files per report`);
  }
  for (const file of files) {
    if (file.size > MAX_INCIDENT_FILE_BYTES) {
      throw new BadRequestException(`"${file.originalname}" exceeds 50 MB limit`);
    }
    const ok =
      ALLOWED_PREFIXES.some((p) => file.mimetype.startsWith(p)) ||
      ALLOWED_TYPES.has(file.mimetype) ||
      file.mimetype === 'application/octet-stream';
    if (!ok) {
      throw new BadRequestException(`File type not allowed: ${file.originalname}`);
    }
  }
}

export function resolveMediaKind(mime: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function custodyHash(opts: {
  incidentId: string;
  sha256Hash: string;
  prevCustodyHash: string | null;
  fileName: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        incidentId: opts.incidentId,
        sha256Hash: opts.sha256Hash,
        prevCustodyHash: opts.prevCustodyHash,
        fileName: opts.fileName,
      }),
    )
    .digest('hex');
}

export async function saveIncidentMedia(
  prisma: PrismaService,
  tenantId: string,
  incidentId: string,
  files: UploadedFile[],
) {
  if (!files.length) return [];

  assertIncidentFilesAllowed(files);

  const tenantDir = join(INCIDENT_UPLOAD_ROOT, tenantId);
  await mkdir(tenantDir, { recursive: true });
  const apiBase = process.env.API_PUBLIC_URL ?? 'http://localhost:4010';

  const last = await prisma.incidentMedia.findFirst({
    where: { incidentId, custodyHash: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { custodyHash: true },
  });
  let prevCustody = last?.custodyHash ?? null;

  const records = [];
  for (const file of files) {
    const safeName = file.originalname.replace(/[^\w.\-()+ ]/g, '_');
    const storedName = `${incidentId.slice(0, 8)}-${randomUUID()}${extname(safeName)}`;
    await writeFile(join(tenantDir, storedName), file.buffer);
    const sha256Hash = sha256Buffer(file.buffer);
    const chain = custodyHash({
      incidentId,
      sha256Hash,
      prevCustodyHash: prevCustody,
      fileName: safeName,
    });

    const row = await prisma.incidentMedia.create({
      data: {
        incidentId,
        fileName: safeName,
        fileType: file.mimetype,
        fileUrl: `${apiBase}/uploads/incidents/${tenantId}/${storedName}`,
        sha256Hash,
        fileSizeBytes: file.size,
        custodyHash: chain,
      },
    });
    prevCustody = chain;
    records.push(row);
  }

  return records.map((m) => ({
    id: m.id,
    fileName: m.fileName,
    fileType: m.fileType,
    fileUrl: m.fileUrl,
    sha256Hash: m.sha256Hash,
    fileSizeBytes: m.fileSizeBytes,
    custodyHash: m.custodyHash,
    kind: resolveMediaKind(m.fileType),
    createdAt: m.createdAt.toISOString(),
  }));
}
