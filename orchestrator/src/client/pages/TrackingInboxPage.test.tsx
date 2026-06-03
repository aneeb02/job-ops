import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";
import { renderWithQueryClient } from "../test/renderWithQueryClient";
import { TrackingInboxPage } from "./TrackingInboxPage";

const render = (ui: Parameters<typeof renderWithQueryClient>[0]) =>
  renderWithQueryClient(ui);

type InboxItem = Awaited<
  ReturnType<typeof api.getPostApplicationInbox>
>["items"][number];

vi.mock("../api", () => ({
  postApplicationProviderStatus: vi.fn(),
  getPostApplicationInbox: vi.fn(),
  getPostApplicationRuns: vi.fn(),
  getJobs: vi.fn(),
  approvePostApplicationInboxItem: vi.fn(),
  denyPostApplicationInboxItem: vi.fn(),
  getPostApplicationRunMessages: vi.fn(),
  postApplicationGmailOauthStart: vi.fn(),
  postApplicationGmailOauthExchange: vi.fn(),
  postApplicationProviderSync: vi.fn(),
  postApplicationProviderDisconnect: vi.fn(),
}));

function makeInboxItem(overrides?: {
  message?: Partial<InboxItem["message"]>;
  matchedJob?: InboxItem["matchedJob"];
}): InboxItem {
  const item: InboxItem = {
    message: {
      id: "msg-1",
      provider: "gmail" as const,
      accountKey: "default",
      integrationId: null,
      syncRunId: null,
      externalMessageId: "ext-1",
      externalThreadId: null,
      fromAddress: "jobs@example.com",
      fromDomain: "example.com",
      senderName: "Recruiting",
      subject: "Interview invite",
      receivedAt: Date.now(),
      snippet: "Let's schedule",
      classificationLabel: "interview",
      classificationConfidence: 0.95,
      classificationPayload: null,
      relevanceLlmScore: 95,
      relevanceDecision: "relevant" as const,
      matchedJobId: "job-2",
      matchConfidence: 95,
      stageTarget: "technical_interview" as const,
      messageType: "interview" as const,
      stageEventPayload: null,
      processingStatus: "pending_user" as const,
      decidedAt: null,
      decidedBy: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    matchedJob: {
      id: "job-2",
      title: "Software Engineer",
      employer: "Example",
    },
  };

  return {
    ...item,
    message: {
      ...item.message,
      ...(overrides?.message ?? {}),
    },
    matchedJob:
      overrides && "matchedJob" in overrides
        ? (overrides.matchedJob ?? null)
        : item.matchedJob,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(api.postApplicationProviderStatus).mockResolvedValue({
    provider: "gmail",
    action: "status",
    accountKey: "default",
    status: {
      provider: "gmail",
      accountKey: "default",
      connected: true,
      integration: {
        id: "int-1",
        provider: "gmail",
        accountKey: "default",
        displayName: null,
        status: "connected",
        credentials: null,
        lastConnectedAt: null,
        lastSyncedAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  });
  vi.mocked(api.getPostApplicationInbox).mockResolvedValue({
    items: [makeInboxItem()],
    total: 1,
  });
  vi.mocked(api.getPostApplicationRuns).mockResolvedValue({
    runs: [],
    total: 0,
  });
  vi.mocked(api.getJobs).mockResolvedValue({
    jobs: [
      {
        id: "job-1",
        source: "manual",
        title: "Software Engineer I",
        employer: "Example",
        jobUrl: "https://example.com/job-1",
        applicationLink: null,
        datePosted: null,
        deadline: null,
        salary: null,
        location: null,
        status: "applied",
        suitabilityScore: null,
        sponsorMatchScore: null,
        jobType: null,
        jobFunction: null,
        salaryMinAmount: null,
        salaryMaxAmount: null,
        salaryCurrency: null,
        discoveredAt: new Date().toISOString(),
        appliedAt: null,
        updatedAt: new Date().toISOString(),
      },
      {
        id: "job-2",
        source: "manual",
        title: "Software Engineer II",
        employer: "Example",
        jobUrl: "https://example.com/job-2",
        applicationLink: null,
        datePosted: null,
        deadline: null,
        salary: null,
        location: null,
        status: "applied",
        suitabilityScore: null,
        sponsorMatchScore: null,
        jobType: null,
        jobFunction: null,
        salaryMinAmount: null,
        salaryMaxAmount: null,
        salaryCurrency: null,
        discoveredAt: new Date().toISOString(),
        appliedAt: null,
        updatedAt: new Date().toISOString(),
      },
    ],
    total: 2,
    byStatus: {
      discovered: 0,
      processing: 0,
      ready: 0,
      applied: 2,
      skipped: 0,
      expired: 0,
    },
    revision: "r1",
  } as Awaited<ReturnType<typeof api.getJobs>>);
  vi.mocked(api.approvePostApplicationInboxItem).mockResolvedValue({
    message: makeInboxItem().message,
    stageEventId: "evt-1",
  });
  vi.mocked(api.denyPostApplicationInboxItem).mockResolvedValue({
    message: {
      ...makeInboxItem().message,
      processingStatus: "ignored",
      matchedJobId: null,
    },
  });
  vi.mocked(api.getPostApplicationRunMessages).mockResolvedValue({
    run: {
      id: "run-1",
      provider: "gmail",
      accountKey: "default",
      integrationId: null,
      status: "completed",
      startedAt: Date.now(),
      completedAt: Date.now(),
      messagesDiscovered: 1,
      messagesRelevant: 1,
      messagesClassified: 1,
      messagesMatched: 1,
      messagesApproved: 0,
      messagesDenied: 0,
      messagesErrored: 0,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    items: [makeInboxItem()],
    total: 1,
  });
  vi.mocked(api.postApplicationProviderSync).mockResolvedValue({
    provider: "gmail",
    action: "sync",
    accountKey: "default",
    status: {
      provider: "gmail",
      accountKey: "default",
      connected: true,
      integration: null,
    },
  });
});

describe("TrackingInboxPage", () => {
  it("renders pending messages", async () => {
    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Interview invite").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Review decision")).toBeInTheDocument();
    expect(screen.getByText("Technical interview")).toBeInTheDocument();
  });

  it("submits approve action", async () => {
    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Interview invite").length).toBeGreaterThan(0);
    });

    const approveButton = screen.getByRole("button", {
      name: "Confirm email-job match",
    });
    await waitFor(() => {
      expect(approveButton).not.toBeDisabled();
    });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(api.approvePostApplicationInboxItem).toHaveBeenCalled();
    });
    expect(api.approvePostApplicationInboxItem).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-2",
      }),
    );
  });

  it("loads dropdown jobs excluding discovered status", async () => {
    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalledWith({
        statuses: ["applied", "in_progress"],
        view: "list",
      });
    });
  });

  it("does not auto-select the first applied job for unmatched messages", async () => {
    vi.mocked(api.getPostApplicationInbox).mockResolvedValue({
      items: [
        makeInboxItem({
          message: {
            matchedJobId: null,
            matchConfidence: 25,
            subject: "Can we talk?",
          },
          matchedJob: null,
        }),
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Can we talk?").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("No reliable match").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Select a job").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Confirm email-job match" }),
    ).toBeDisabled();
  });

  it("does not sync when sync limits are invalid", async () => {
    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Interview invite").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText("Inbox settings"));
    fireEvent.change(screen.getByLabelText("Max Messages"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));

    expect(api.postApplicationProviderSync).not.toHaveBeenCalled();
  });

  it("opens messages for a sync run", async () => {
    vi.mocked(api.getPostApplicationRuns).mockResolvedValue({
      runs: [
        {
          id: "run-1",
          provider: "gmail",
          accountKey: "default",
          integrationId: null,
          status: "completed",
          startedAt: Date.now(),
          completedAt: Date.now(),
          messagesDiscovered: 1,
          messagesRelevant: 1,
          messagesClassified: 1,
          messagesMatched: 1,
          messagesApproved: 0,
          messagesDenied: 0,
          messagesErrored: 0,
          errorCode: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <TrackingInboxPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("run-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("run-1"));

    await waitFor(() => {
      expect(api.getPostApplicationRunMessages).toHaveBeenCalledWith({
        runId: "run-1",
        provider: "gmail",
        accountKey: "default",
      });
    });
  });
});
