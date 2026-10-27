import "server-only";

import { cache } from "react";

import type {
  BlockedPeriod,
  ClinicLocation,
  ClinicService,
  ClinicSpecialist,
  HoursOverride,
  ServiceListQuery,
  SpecialistListQuery,
} from "@/domain/clinic";

import {
  apiGetLocation,
  apiGetSpecialist,
  apiListBlocks,
  apiListOverrides,
  apiListServices,
  apiListSpecialists,
  apiSpecialistConflicts,
} from "./api/clinic";
import type { DayAppointment } from "./appointments";
import { isApiError } from "./api/errors";
import { mapDayAppointment } from "./api/mappers/appointments";
import {
  mapBlock,
  mapClinicService,
  mapClinicSpecialist,
  mapLocation,
  mapOverride,
  serviceListParams,
  specialistListParams,
} from "./api/mappers/clinic";
import { mapPage } from "./api/mappers/page";
import { collectAllPages } from "./api/pages";
import { requireApiToken } from "./auth";
import * as mock from "./mock/clinic";
import { dataSource } from "./source";
import { paginate, type Page } from "./types";

/**
 * Specialists, services, schedules and the clinic read seam (contract
 * §2.17, gap FND-1). Dispatches on `dataSource()`: the demo reads
 * `./mock/clinic.ts`; the api branch reads the admin endpoints.
 */

const API_ID = /^\d{1,18}$/;

export async function listSpecialists(query: SpecialistListQuery): Promise<Page<ClinicSpecialist>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListSpecialists(token, specialistListParams(query));
    return mapPage(data, mapClinicSpecialist);
  }
  return mock.listSpecialists(query);
}

/** `null` for an unknown id (404). Deduplicated per render. */
export const getSpecialist = cache(async (id: string): Promise<ClinicSpecialist | null> => {
  if ((await dataSource()) === "api") {
    if (!API_ID.test(id)) return null;
    const token = await requireApiToken();
    try {
      return mapClinicSpecialist((await apiGetSpecialist(token, id)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.MOCK_SPECIALISTS.find((s) => s.id === id) ?? null;
});

export async function listServices(query: ServiceListQuery): Promise<Page<ClinicService>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListServices(token, serviceListParams(query));
    return mapPage(data, mapClinicService);
  }
  return mock.listServices(query);
}

/** Every service (active or not), by position: the offer editor's choices. */
export async function listAllServices(): Promise<ClinicService[]> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const rows = await collectAllPages(
      async (page) => (await apiListServices(token, { page, page_size: 50 })).data,
      { pageSize: 50, path: "services/" },
    );
    return rows.map(mapClinicService);
  }
  return [...mock.MOCK_SERVICES];
}

/** The clinic; `null` until the first save creates it (404). */
export async function getLocation(): Promise<ClinicLocation | null> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    try {
      return mapLocation((await apiGetLocation(token)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.MOCK_LOCATION;
}

/** The specialist's date overrides from today on (Tashkent), by date. */
export async function listOverrides(id: string, page = 1): Promise<Page<HoursOverride>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListOverrides(token, id, { page, page_size: 50 });
    return mapPage(data, mapOverride);
  }
  return paginate(mock.MOCK_OVERRIDES[id] ?? [], page, 50);
}

/** The specialist's blocked periods touching today or later, by start. */
export async function listBlocks(id: string, page = 1): Promise<Page<BlockedPeriod>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListBlocks(token, id, { page, page_size: 50 });
    return mapPage(data, mapBlock);
  }
  return paginate(mock.MOCK_BLOCKS[id] ?? [], page, 50);
}

/** Open appointments ahead that the current schedule no longer covers (the demo has none). */
export async function listConflicts(id: string): Promise<DayAppointment[]> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return (await apiSpecialistConflicts(token, id)).data.results.map(mapDayAppointment);
  }
  return [];
}
