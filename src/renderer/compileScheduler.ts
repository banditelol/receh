export type CompileSourceIdentity = {
  documentId: string;
  passId: string;
  source: string;
};

export type CompileRevision = CompileSourceIdentity & {
  revision: number;
};

export type CompileTicket = {
  documentId: string;
  passId: string;
  revision: number;
  request: number;
  generation: number;
};

function sameTarget(
  left: Pick<CompileTicket, "documentId" | "passId" | "revision">,
  right: Pick<CompileTicket, "documentId" | "passId" | "revision">,
) {
  return (
    left.documentId === right.documentId &&
    left.passId === right.passId &&
    left.revision === right.revision
  );
}

export function advanceCompileRevision(
  previous: CompileRevision | undefined,
  source: CompileSourceIdentity,
): CompileRevision {
  if (
    previous?.documentId === source.documentId &&
    previous.passId === source.passId &&
    previous.source === source.source
  ) {
    return previous;
  }
  return { ...source, revision: (previous?.revision ?? 0) + 1 };
}

export class CompileScheduler {
  #generation = 0;
  #target: Pick<CompileTicket, "documentId" | "passId" | "revision"> | undefined;

  updateTarget(target: Pick<CompileTicket, "documentId" | "passId" | "revision">) {
    if (this.#target && sameTarget(this.#target, target)) return false;
    this.#target = { ...target };
    this.#generation += 1;
    return true;
  }

  begin(target: CompileRevision, request: number): CompileTicket {
    this.updateTarget(target);
    this.#generation += 1;
    return {
      documentId: target.documentId,
      passId: target.passId,
      revision: target.revision,
      request,
      generation: this.#generation,
    };
  }

  isCurrent(ticket: CompileTicket) {
    return (
      ticket.generation === this.#generation &&
      this.#target !== undefined &&
      sameTarget(ticket, this.#target)
    );
  }

  invalidate() {
    this.#target = undefined;
    this.#generation += 1;
  }
}
