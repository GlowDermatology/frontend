"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { clinicText, type ClinicLocation } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";

import { PageHeader } from "../shared/page-header";
import { specialistsCopy } from "../specialists/copy";
import { ClinicDialog } from "../specialists/location-card";

export function ClinicsView({ clinics }: { clinics: ClinicLocation[] }) {
  const locale = useAdminLocale();
  const t = useCopy(specialistsCopy).location;
  const { status } = useCopy(clinicDataCopy);
  const [source, setSource] = useState(clinics);
  const [rows, setRows] = useState(clinics);
  const [dialog, setDialog] = useState<{ clinic: ClinicLocation | null } | null>(null);
  if (clinics !== source) {
    setSource(clinics);
    setRows(clinics);
  }

  return (
    <>
      <PageHeader
        title={t.listTitle}
        actions={
          <Button onClick={() => setDialog({ clinic: null })}>
            <Icon name="plus" size={18} />
            {t.add}
          </Button>
        }
      />
      {rows.length === 0 ? (
        <Card className="flex items-center gap-3 text-ink-muted">
          <Icon name="map-pin" size={22} />
          <p className="m-0">{t.empty}</p>
        </Card>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 xl:grid-cols-2">
          {rows.map((clinic) => (
            <li key={clinic.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-heading">{clinicText(clinic.name, locale)}</CardTitle>
                  <Badge tone={clinic.isActive ? "success" : "muted"}>
                    {clinic.isActive ? status.active : status.inactive}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 text-body-sm text-ink">
                  <Icon name="map-pin" size={18} className="mt-0.5 shrink-0 text-ink-muted" />
                  <div className="flex flex-col gap-1">
                    <p className="m-0">{clinicText(clinic.address, locale)}</p>
                    {clinicText(clinic.directions, locale) && (
                      <p className="m-0 text-ink-muted">{clinicText(clinic.directions, locale)}</p>
                    )}
                    {clinic.phone && <p className="m-0 text-ink-muted">{clinic.phone}</p>}
                  </div>
                </div>
                <div className="mt-auto flex justify-end">
                  <Button variant="outline" onClick={() => setDialog({ clinic })}>
                    {t.edit}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <ClinicDialog
          location={dialog.clinic}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            setRows((current) =>
              current.some((clinic) => clinic.id === saved.id)
                ? current.map((clinic) => (clinic.id === saved.id ? saved : clinic))
                : [...current, saved],
            );
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
