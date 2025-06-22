-- Creates or replaces a helper to clear and bulk-insert suggestions in one round-trip.
-- Parameters:
--   doc_id       – UUID of the parent document
--   suggestions  – JSONB array of suggestion records.  Each element must have
--                  keys: start_index, end_index, suggestion_type,
--                        original_text, suggested_text, message
--
-- Usage from Supabase JS:
--   supabase.rpc("save_suggestions", {
--     doc_id: "<uuid>",
--     suggestions: my_array_of_objects
--   })
--
-- The function leverages `jsonb_to_recordset` for fast bulk insert.
-- RLS on `suggestions` still applies, so callers can insert only into rows
-- they own via the parent `documents` table.

create or replace function public.save_suggestions(
  doc_id uuid,
  suggestions jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- delete existing rows for this document id
  delete from suggestions where document_id = doc_id;

  -- if no new suggestions, we're done
  if jsonb_array_length(suggestions) = 0 then
    return;
  end if;

  -- bulk insert using jsonb_to_recordset for speed
  insert into suggestions (
    document_id,
    start_index,
    end_index,
    suggestion_type,
    original_text,
    suggested_text,
    message
  )
  select
    doc_id,
    (s->>'start_index')::int,
    (s->>'end_index')::int,
    s->>'suggestion_type',
    s->>'original_text',
    s->>'suggested_text',
    s->>'message'
  from jsonb_array_elements(suggestions) as t(s);
end;
$$; 