import { NoteDetail } from "@/components/note-detail";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NoteDetail id={id} />;
}
