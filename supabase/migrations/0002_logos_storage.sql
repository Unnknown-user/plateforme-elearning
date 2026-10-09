-- Étape 3 : stockage des logos d'organismes.
-- À appliquer dans Supabase (SQL Editor) après 0001.
-- Le dossier d'un organisme porte son identifiant : logos/<organization_id>/<fichier>.
-- Lecture publique (un logo n'est pas une donnée sensible) ; écriture réservée à l'administrateur
-- de CET organisme. Formats : PNG, JPEG, WebP, 1 Mo maximum (SVG exclu volontairement).
-- ⚠️ À REVOIR AVANT MISE EN VENTE : analyse antivirus / redimensionnement des images envoyées.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "logos_insert_own_org_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_user_role() = 'admin'
  );

create policy "logos_update_own_org_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_user_role() = 'admin'
  );

create policy "logos_delete_own_org_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and public.current_user_role() = 'admin'
  );
