import { dismissChecklist } from "@/lib/checklist/checklist";
import { failFromError } from "@/app/api/_lib/errors";
import { noContent } from "@/app/api/_lib/respond";

export async function POST(): Promise<Response> {
  try {
    await dismissChecklist();
    return noContent();
  } catch (error) {
    return failFromError(error);
  }
}
