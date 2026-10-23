import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import type { StatusTemplate } from "@/domain/notification";
import { CONTENT_LANGUAGES } from "@/domain/product";

import { ORDER_STATUS_META } from "../shared/status";

const LANGUAGE_NAME = { uz: "o‘zbekcha", ru: "ruscha", en: "inglizcha" } as const;

/** Automatic order-status pushes (sent by the backend, not from this screen). */
export function TemplatesSection({ templates }: { templates: ReadonlyArray<StatusTemplate> }) {
  return (
    <Card aria-labelledby="status-templates-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle id="status-templates-title" className="text-heading">
          Buyurtma holati shablonlari
        </CardTitle>
        <span className="text-caption font-normal text-ink-muted">
          O‘zgaruvchilar: {"{raqam}"}, {"{ism}"}, {"{summa}"}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3 p-0">
        {templates.map((template) => {
          const meta = ORDER_STATUS_META[template.status];
          return (
            <li
              key={template.status}
              className="flex flex-col gap-2 rounded-md border border-line p-3.5"
            >
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <p className="m-0 text-body-sm text-ink">{template.text}</p>
              <p className="m-0 flex gap-1.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink-muted">
                {CONTENT_LANGUAGES.map((language) => (
                  <span key={language}>
                    <span aria-hidden="true">
                      {language.toUpperCase()} {template.translations[language] ? "✓" : "—"}
                    </span>
                    <span className="sr-only">
                      {LANGUAGE_NAME[language]} matn{" "}
                      {template.translations[language] ? "bor" : "yo‘q"};
                    </span>
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
