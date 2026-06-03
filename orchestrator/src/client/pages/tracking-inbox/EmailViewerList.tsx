import type {
  JobListItem,
  PostApplicationInboxItem,
  PostApplicationMessageType,
  PostApplicationRouterStageTarget,
} from "@shared/types";
import {
  AlertCircle,
  CheckCircle2,
  CircleUserRound,
  Clock3,
  Mail,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";
import { cn, formatDateTime } from "@/lib/utils";

export type EmailViewerListProps = {
  items: PostApplicationInboxItem[];
  appliedJobs: JobListItem[];
  appliedJobByMessageId: Record<string, string>;
  onAppliedJobChange: (messageId: string, value: string) => void;
  onDecision: (
    item: PostApplicationInboxItem,
    decision: "approve" | "deny",
  ) => void;
  isActionLoading: boolean;
  isAppliedJobsLoading: boolean;
};

type ConfidenceTone = "success" | "warning" | "muted";

type ConfidencePresentation = {
  label: string;
  value: string;
  tone: ConfidenceTone;
};

const messageTypeLabel: Record<PostApplicationMessageType, string> = {
  interview: "Interview",
  rejection: "Rejection",
  offer: "Offer",
  update: "Update",
  other: "Other",
};

const stageTargetLabel: Record<PostApplicationRouterStageTarget, string> = {
  no_change: "No timeline change",
  applied: "Applied",
  recruiter_screen: "Recruiter screen",
  assessment: "Assessment",
  hiring_manager_screen: "Hiring manager screen",
  technical_interview: "Technical interview",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

function formatEpochMs(value?: number | null): string {
  if (!value) return "n/a";
  return formatDateTime(new Date(value).toISOString()) ?? "n/a";
}

function getSenderLabel(
  senderName: string | null,
  fromAddress: string,
): string {
  const preferred = (senderName ?? "").trim();
  if (preferred) return preferred;
  const trimmed = fromAddress.trim();
  if (!trimmed) return "Unknown sender";
  const bracketIndex = trimmed.indexOf("<");
  if (bracketIndex > 0) {
    return trimmed.slice(0, bracketIndex).trim() || trimmed;
  }
  return trimmed;
}

function getConfidencePresentation(
  score: number | null,
): ConfidencePresentation {
  if (score === null || score < 50) {
    return { label: "Needs match", value: "n/a", tone: "muted" };
  }
  if (score >= 90) {
    return {
      label: "High confidence",
      value: `${Math.round(score)}%`,
      tone: "success",
    };
  }
  return {
    label: "Needs review",
    value: `${Math.round(score)}%`,
    tone: "warning",
  };
}

function confidenceBadgeClassName(tone: ConfidenceTone): string {
  if (tone === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }
  if (tone === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border/60 bg-muted/25 text-muted-foreground";
}

function formatAppliedJobLabel(job: JobListItem): string {
  const employer = job.employer.trim();
  const title = job.title.trim();
  if (employer && title) return `${employer} - ${title}`;
  if (title) return title;
  if (employer) return employer;
  return job.id;
}

function getSelectedAppliedJob(
  jobs: JobListItem[],
  selectedAppliedJobId: string,
): JobListItem | null {
  if (!selectedAppliedJobId) return null;
  return jobs.find((job) => job.id === selectedAppliedJobId) ?? null;
}

type ReviewQueueProps = {
  items: PostApplicationInboxItem[];
  selectedMessageId: string;
  onSelect: (messageId: string) => void;
};

const ReviewQueue: React.FC<ReviewQueueProps> = ({
  items,
  selectedMessageId,
  onSelect,
}) => (
  <div className="min-h-[28rem] overflow-hidden rounded-lg border border-border/60 bg-card/40">
    <div className="border-b border-border/60 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Review queue</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} pending message{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <Mail className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const sender = getSenderLabel(
          item.message.senderName,
          item.message.fromAddress,
        );
        const confidence = getConfidencePresentation(
          item.message.matchConfidence,
        );
        const selected = item.message.id === selectedMessageId;
        const matchedJobLabel = item.matchedJob
          ? `${item.matchedJob.employer} - ${item.matchedJob.title}`
          : "No reliable match";

        return (
          <button
            key={item.message.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item.message.id)}
            className={cn(
              "block w-full px-4 py-3 text-left transition-colors",
              selected ? "bg-muted/45" : "hover:bg-muted/25",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/35 text-muted-foreground">
                <CircleUserRound className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{sender}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatEpochMs(item.message.receivedAt)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium">
                  {item.message.subject || "No subject"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.message.snippet || "No snippet captured."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {messageTypeLabel[item.message.messageType]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      confidenceBadgeClassName(confidence.tone),
                    )}
                  >
                    {confidence.label}
                    {confidence.value !== "n/a" ? ` ${confidence.value}` : ""}
                  </Badge>
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  Suggested:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      item.matchedJob
                        ? "text-foreground/80"
                        : "text-amber-700 dark:text-amber-300",
                    )}
                  >
                    {matchedJobLabel}
                  </span>
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

type ReviewDetailPanelProps = {
  item: PostApplicationInboxItem | null;
  jobs: JobListItem[];
  selectedAppliedJobId: string;
  onAppliedJobChange: (jobId: string) => void;
  onApprove: () => void;
  onDeny: () => void;
  isActionLoading: boolean;
  isAppliedJobsLoading: boolean;
};

const ReviewDetailPanel: React.FC<ReviewDetailPanelProps> = ({
  item,
  jobs,
  selectedAppliedJobId,
  onAppliedJobChange,
  onApprove,
  onDeny,
  isActionLoading,
  isAppliedJobsLoading,
}) => {
  const appliedJobOptions = useMemo(
    () =>
      jobs.map((job) => ({
        value: job.id,
        label: formatAppliedJobLabel(job),
        searchText: `${job.employer} ${job.title} ${job.location ?? ""}`.trim(),
      })),
    [jobs],
  );

  if (!item) {
    return (
      <aside className="rounded-lg border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Select a message to review its match and timeline update.
      </aside>
    );
  }

  const sender = getSenderLabel(
    item.message.senderName,
    item.message.fromAddress,
  );
  const confidence = getConfidencePresentation(item.message.matchConfidence);
  const selectedAppliedJob = getSelectedAppliedJob(jobs, selectedAppliedJobId);
  const isActionable = item.message.processingStatus === "pending_user";
  const canApprove = isActionable && Boolean(selectedAppliedJobId);
  const hasAppliedJobs = jobs.length > 0;
  const stageTarget =
    item.message.stageTarget && stageTargetLabel[item.message.stageTarget]
      ? stageTargetLabel[item.message.stageTarget]
      : "No timeline change";

  return (
    <aside className="rounded-lg border border-border/60 bg-card/40">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Review decision</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Confirm the job match before updating the timeline.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[10px]",
              confidenceBadgeClassName(confidence.tone),
            )}
          >
            {confidence.label}
            {confidence.value !== "n/a" ? ` ${confidence.value}` : ""}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <section className="space-y-2">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/35 text-muted-foreground">
              <CircleUserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{sender}</p>
              <p className="truncate text-xs text-muted-foreground">
                {item.message.fromAddress}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {formatEpochMs(item.message.receivedAt)}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {item.message.subject || "No subject"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.message.snippet || "No snippet captured."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {messageTypeLabel[item.message.messageType]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {item.message.relevanceDecision.replace(/_/g, " ")}
            </Badge>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-muted-foreground">
              Matched job
            </div>
            {item.matchedJob ? (
              <span className="text-[11px] text-muted-foreground">
                Suggested by router
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                No reliable match
              </span>
            )}
          </div>
          <SearchableDropdown
            value={selectedAppliedJobId}
            options={appliedJobOptions}
            onValueChange={onAppliedJobChange}
            placeholder={
              isAppliedJobsLoading ? "Loading applied jobs..." : "Select job"
            }
            searchPlaceholder="Search applied jobs..."
            emptyText={
              isAppliedJobsLoading
                ? "Loading jobs..."
                : "No applied or in-progress jobs found."
            }
            disabled={isActionLoading || isAppliedJobsLoading}
            triggerClassName="w-full"
            contentClassName="w-[360px]"
            ariaLabel="Select job"
          />
          {!hasAppliedJobs && !isAppliedJobsLoading ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Messages can only be approved after a job is applied or in
              progress.
            </p>
          ) : null}
        </section>

        <section className="rounded-md border border-border/60 bg-background/35 p-3">
          <div className="text-xs font-medium text-muted-foreground">
            Approval preview
          </div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Link to</span>
              <span className="max-w-[18rem] text-right font-medium">
                {selectedAppliedJob
                  ? formatAppliedJobLabel(selectedAppliedJob)
                  : "Select a job"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Timeline update</span>
              <span className="text-right font-medium">{stageTarget}</span>
            </div>
          </div>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            aria-label="Confirm email-job match"
            title="Confirm email-job match"
            onClick={onApprove}
            disabled={isActionLoading || !canApprove}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Ignore this match"
            title="Ignore this match"
            onClick={onDeny}
            disabled={isActionLoading || !isActionable}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Ignore
          </Button>
        </div>
      </div>
    </aside>
  );
};

export const EmailViewerList: React.FC<EmailViewerListProps> = ({
  items,
  appliedJobs,
  appliedJobByMessageId,
  onAppliedJobChange,
  onDecision,
  isActionLoading,
  isAppliedJobsLoading,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState(
    () => items[0]?.message.id ?? "",
  );

  useEffect(() => {
    if (items.length === 0) {
      setSelectedMessageId("");
      return;
    }
    if (!items.some((item) => item.message.id === selectedMessageId)) {
      setSelectedMessageId(items[0]?.message.id ?? "");
    }
  }, [items, selectedMessageId]);

  const selectedItem =
    items.find((item) => item.message.id === selectedMessageId) ??
    items[0] ??
    null;
  const selectedAppliedJobId = selectedItem
    ? (appliedJobByMessageId[selectedItem.message.id] ?? "")
    : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <ReviewQueue
        items={items}
        selectedMessageId={selectedItem?.message.id ?? ""}
        onSelect={setSelectedMessageId}
      />
      <ReviewDetailPanel
        item={selectedItem}
        jobs={appliedJobs}
        selectedAppliedJobId={selectedAppliedJobId}
        onAppliedJobChange={(value) => {
          if (!selectedItem) return;
          onAppliedJobChange(selectedItem.message.id, value);
        }}
        onApprove={() => {
          if (!selectedItem) return;
          onDecision(selectedItem, "approve");
        }}
        onDeny={() => {
          if (!selectedItem) return;
          onDecision(selectedItem, "deny");
        }}
        isActionLoading={isActionLoading}
        isAppliedJobsLoading={isAppliedJobsLoading}
      />
    </div>
  );
};
