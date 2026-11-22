import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { requireSpecialist } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { copyFor } from "@/lib/i18n/admin-locale";

import { PageHeader } from "../shared/page-header";
import { shellCopy } from "../shell/copy";
import type { SpecialistSection } from "../shell/nav-items";
import { workspaceCopy } from "./copy";

/**
 * The body of a specialist workspace page whose content is not built yet: the page title and a
 * way back to the Appointments page, inside the specialist shell.
 */
export async function WorkspacePlaceholder({ section }: { section: SpecialistSection }) {
  await requireSpecialist();
  const [shell, copy] = await Promise.all([copyFor(shellCopy), copyFor(workspaceCopy)]);
  const t = copy.placeholder;
  return (
    <>
      <PageHeader title={shell.specialistNav[section]} />
      <Card className="flex flex-col items-start gap-3">
        <CardTitle>{t.title}</CardTitle>
        <p className="m-0 text-body-sm text-ink-muted">{t.description}</p>
        <Link href={SPECIALIST_HOME} className={buttonStyles({ variant: "outline", size: "sm" })}>
          {t.open}
        </Link>
      </Card>
    </>
  );
}
