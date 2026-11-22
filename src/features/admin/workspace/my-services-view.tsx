"use client";

import { useState } from "react";

import type { SpecialistService } from "@/domain/clinic";
import { useCopy } from "@/lib/i18n/admin-context";

import { PageHeader } from "../shared/page-header";
import { shellCopy } from "../shell/copy";
import { OWN_SERVICE_ACTIONS } from "../specialists/card-actions";
import { ServicesCard } from "../specialists/services-card";
import { workspaceCopy } from "./copy";

/**
 * The specialist's own services: the staff detail page's services card on `specialist/services/…`
 * (create, edit, activate or deactivate, and delete a service that was never booked).
 */
export function MyServicesView({ services }: { services: ReadonlyArray<SpecialistService> }) {
  const shell = useCopy(shellCopy);
  const t = useCopy(workspaceCopy).services;
  const [source, setSource] = useState(services);
  const [rows, setRows] = useState(services);
  if (services !== source) {
    setSource(services);
    setRows(services);
  }
  const active = rows.filter((service) => service.isActive).length;

  return (
    <>
      <PageHeader
        eyebrow={t.count(active, rows.length)}
        title={shell.specialistNav["my-services"]}
      />
      <ServicesCard services={services} actions={OWN_SERVICE_ACTIONS} onChange={setRows} />
    </>
  );
}
