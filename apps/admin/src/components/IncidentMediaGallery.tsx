'use client';



import { resolveMediaUrl } from '@/lib/media-url';



type MediaItem = {

  id: string;

  fileName: string;

  fileType: string;

  fileUrl: string;

  createdAt?: string;

};



function kindFromMime(mime: string): 'image' | 'video' | 'audio' | 'document' {

  if (mime.startsWith('image/')) return 'image';

  if (mime.startsWith('video/')) return 'video';

  if (mime.startsWith('audio/')) return 'audio';

  return 'document';

}



export function IncidentMediaGallery({ media }: { media: MediaItem[] }) {

  if (!media.length) return null;



  return (

    <div className="incident-media-gallery">

      {media.map((m) => {

        const kind = kindFromMime(m.fileType);

        const url = resolveMediaUrl(m.fileUrl) ?? m.fileUrl;

        return (

          <div key={m.id} className={`incident-media-item incident-media-item--${kind}`}>

            {kind === 'image' && (

              <a href={url} target="_blank" rel="noopener noreferrer">

                <img src={url} alt={m.fileName} />

              </a>

            )}

            {kind === 'video' && (

              <video src={url} controls preload="metadata" />

            )}

            {kind === 'audio' && (

              <audio src={url} controls preload="metadata" />

            )}

            {kind === 'document' && (

              <a href={url} target="_blank" rel="noopener noreferrer" download className="incident-media-doc">

                <span aria-hidden>📄</span>

                <span>{m.fileName}</span>

              </a>

            )}

            <span className="incident-media-item__name">{m.fileName}</span>

          </div>

        );

      })}

    </div>

  );

}

