import type { JobSource } from "@shared/types.js";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  DateFilterDimension,
  DateFilterPreset,
  JobDateFilter,
  JobSort,
  RemoteFilter,
  SalaryFilter,
  SalaryFilterMode,
  ScoreFilter,
  SponsorFilter,
} from "./constants";
import { DEFAULT_SORT, dateFilterDimensionOrder } from "./constants";

const allowedSponsorFilters: SponsorFilter[] = [
  "all",
  "confirmed",
  "potential",
  "not_found",
  "unknown",
];
const allowedSalaryModes: SalaryFilterMode[] = [
  "at_least",
  "at_most",
  "between",
];
const allowedRemoteFilters: RemoteFilter[] = ["all", "remote", "onsite"];
const allowedSortKeys: JobSort["key"][] = [
  "date",
  "discoveredAt",
  "score",
  "salary",
  "title",
  "employer",
];
const allowedSortDirections: JobSort["direction"][] = ["asc", "desc"];
const allowedDateFilterPresets: DateFilterPreset[] = [
  "7",
  "14",
  "30",
  "90",
  "custom",
];

const isValidDateInput = (value: string | null): value is string =>
  value != null && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateDimensions = (value: string | null): DateFilterDimension[] => {
  if (!value) return [];

  const seen = new Set<DateFilterDimension>();

  for (const token of value.split(",")) {
    if (!dateFilterDimensionOrder.includes(token as DateFilterDimension)) {
      continue;
    }
    seen.add(token as DateFilterDimension);
  }

  return dateFilterDimensionOrder.filter((dimension) => seen.has(dimension));
};

const parseCommaList = (value: string | null): string[] =>
  Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  );

const parsePositiveInt = (value: string | null): number | null => {
  const parsed = value == null ? Number.NaN : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseScore = (value: string | null): number | null => {
  const parsed = value == null ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : null;
};

export const useOrchestratorFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const setSearchQuery = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = value.trim();
          if (next) prev.set("q", next);
          else prev.delete("q");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const sourceFilter =
    (searchParams.get("source") as JobSource | "all") || "all";
  const setSourceFilter = useCallback(
    (source: JobSource | "all") => {
      setSearchParams(
        (prev) => {
          if (source !== "all") prev.set("source", source);
          else prev.delete("source");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const sponsorFilter = useMemo((): SponsorFilter => {
    const raw = searchParams.get("sponsor") ?? "all";
    return allowedSponsorFilters.includes(raw as SponsorFilter)
      ? (raw as SponsorFilter)
      : "all";
  }, [searchParams]);

  const setSponsorFilter = useCallback(
    (value: SponsorFilter) => {
      setSearchParams(
        (prev) => {
          if (value === "all") prev.delete("sponsor");
          else prev.set("sponsor", value);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const salaryFilter = useMemo((): SalaryFilter => {
    const modeRaw = searchParams.get("salaryMode") ?? "at_least";
    const mode = allowedSalaryModes.includes(modeRaw as SalaryFilterMode)
      ? (modeRaw as SalaryFilterMode)
      : "at_least";

    const min = parsePositiveInt(
      searchParams.get("salaryMin") ?? searchParams.get("minSalary"),
    );
    const max = parsePositiveInt(searchParams.get("salaryMax"));

    return { mode, min, max };
  }, [searchParams]);

  const setSalaryFilter = useCallback(
    (value: SalaryFilter) => {
      setSearchParams(
        (prev) => {
          if (value.mode === "at_least") prev.delete("salaryMode");
          else prev.set("salaryMode", value.mode);

          if (value.min == null || value.min <= 0) prev.delete("salaryMin");
          else prev.set("salaryMin", String(value.min));

          if (value.max == null || value.max <= 0) prev.delete("salaryMax");
          else prev.set("salaryMax", String(value.max));

          prev.delete("minSalary");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const sort = useMemo((): JobSort => {
    const sortValue = searchParams.get("sort");
    if (!sortValue) return DEFAULT_SORT;

    const [key, direction] = sortValue.split("-");
    if (
      !allowedSortKeys.includes(key as JobSort["key"]) ||
      !allowedSortDirections.includes(direction as JobSort["direction"])
    ) {
      return DEFAULT_SORT;
    }

    return {
      key: key as JobSort["key"],
      direction: direction as JobSort["direction"],
    };
  }, [searchParams]);

  const remoteFilter = useMemo((): RemoteFilter => {
    const raw = searchParams.get("remote") ?? "all";
    return allowedRemoteFilters.includes(raw as RemoteFilter)
      ? (raw as RemoteFilter)
      : "all";
  }, [searchParams]);

  const setRemoteFilter = useCallback(
    (value: RemoteFilter) => {
      setSearchParams(
        (prev) => {
          if (value === "all") prev.delete("remote");
          else prev.set("remote", value);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const locationFilter = searchParams.get("location")?.trim() ?? "";
  const setLocationFilter = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = value.trim();
          if (next) prev.set("location", next);
          else prev.delete("location");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const scoreFilter = useMemo(
    (): ScoreFilter => ({
      min: parseScore(searchParams.get("scoreMin")),
      max: parseScore(searchParams.get("scoreMax")),
    }),
    [searchParams],
  );

  const setScoreFilter = useCallback(
    (value: ScoreFilter) => {
      setSearchParams(
        (prev) => {
          if (value.min == null) prev.delete("scoreMin");
          else prev.set("scoreMin", String(value.min));

          if (value.max == null) prev.delete("scoreMax");
          else prev.set("scoreMax", String(value.max));
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const jobTypeFilter = useMemo(
    () => parseCommaList(searchParams.get("jobType")),
    [searchParams],
  );
  const setJobTypeFilter = useCallback(
    (values: string[]) => {
      setSearchParams(
        (prev) => {
          const next = parseCommaList(values.join(",")).join(",");
          if (next) prev.set("jobType", next);
          else prev.delete("jobType");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const jobFunctionFilter = useMemo(
    () => parseCommaList(searchParams.get("jobFunction")),
    [searchParams],
  );
  const setJobFunctionFilter = useCallback(
    (values: string[]) => {
      setSearchParams(
        (prev) => {
          const next = parseCommaList(values.join(",")).join(",");
          if (next) prev.set("jobFunction", next);
          else prev.delete("jobFunction");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const dateFilter = useMemo((): JobDateFilter => {
    const startDateRaw = searchParams.get("appliedStart");
    const endDateRaw = searchParams.get("appliedEnd");
    const startDate = isValidDateInput(startDateRaw) ? startDateRaw : null;
    const endDate = isValidDateInput(endDateRaw) ? endDateRaw : null;

    const presetRaw = searchParams.get("appliedRange");
    const preset = allowedDateFilterPresets.includes(
      presetRaw as DateFilterPreset,
    )
      ? (presetRaw as DateFilterPreset)
      : null;

    const dimensions = parseDateDimensions(searchParams.get("date"));

    return {
      dimensions,
      startDate,
      endDate,
      preset,
    };
  }, [searchParams]);

  const setSort = useCallback(
    (newSort: JobSort) => {
      setSearchParams(
        (prev) => {
          if (
            newSort.key === DEFAULT_SORT.key &&
            newSort.direction === DEFAULT_SORT.direction
          ) {
            prev.delete("sort");
          } else {
            prev.set("sort", `${newSort.key}-${newSort.direction}`);
          }
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setDateFilter = useCallback(
    (value: JobDateFilter) => {
      setSearchParams(
        (prev) => {
          if (value.dimensions.length === 0) prev.delete("date");
          else prev.set("date", value.dimensions.join(","));

          if (value.startDate == null) prev.delete("appliedStart");
          else prev.set("appliedStart", value.startDate);

          if (value.endDate == null) prev.delete("appliedEnd");
          else prev.set("appliedEnd", value.endDate);

          if (value.preset == null) prev.delete("appliedRange");
          else prev.set("appliedRange", value.preset);

          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        prev.delete("source");
        prev.delete("sponsor");
        prev.delete("salaryMode");
        prev.delete("salaryMin");
        prev.delete("salaryMax");
        prev.delete("minSalary");
        prev.delete("sort");
        prev.delete("q");
        prev.delete("remote");
        prev.delete("location");
        prev.delete("scoreMin");
        prev.delete("scoreMax");
        prev.delete("jobType");
        prev.delete("jobFunction");
        prev.delete("date");
        prev.delete("appliedStart");
        prev.delete("appliedEnd");
        prev.delete("appliedRange");
        return prev;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return {
    searchParams,
    searchQuery,
    setSearchQuery,
    sourceFilter,
    setSourceFilter,
    sponsorFilter,
    setSponsorFilter,
    salaryFilter,
    setSalaryFilter,
    remoteFilter,
    setRemoteFilter,
    locationFilter,
    setLocationFilter,
    scoreFilter,
    setScoreFilter,
    jobTypeFilter,
    setJobTypeFilter,
    jobFunctionFilter,
    setJobFunctionFilter,
    dateFilter,
    setDateFilter,
    sort,
    setSort,
    resetFilters,
  };
};
