import { CONSENT_VERSION, POLICY_VERSION } from '@/lib/device-security';
import { LEGAL_DOC_ID, LEGAL_SECTIONS } from '@/lib/legal-content';

export function LegalDocumentMeta() {
  return (
    <dl className="legal-doc__meta">
      <div>
        <dt>File</dt>
        <dd>{LEGAL_DOC_ID}</dd>
      </div>
      <div>
        <dt>Policy</dt>
        <dd>v{POLICY_VERSION}</dd>
      </div>
      <div>
        <dt>Consent version</dt>
        <dd>{CONSENT_VERSION}</dd>
      </div>
    </dl>
  );
}

export function LegalDocumentSections() {
  return (
    <div className="legal-doc">
      {LEGAL_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="legal-doc__section">
          <header>
            <span aria-hidden>{section.number}</span>
            <h2>{section.title}</h2>
          </header>
          {section.intro ? <p>{section.intro}</p> : null}
          <ol className="legal-doc__clauses">
            {section.clauses.map((text, i) => (
              <li key={text}>
                <em>
                  {Number(section.number)}.{i + 1}
                </em>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          {section.note ? <p className="legal-doc__note">{section.note}</p> : null}
        </section>
      ))}
    </div>
  );
}
