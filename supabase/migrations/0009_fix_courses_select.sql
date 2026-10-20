-- Correctif de 0008 : créer un parcours était refusé.
-- Cause : « insert ... returning » vérifie la règle de lecture sur la ligne qu'on vient de créer.
-- can_access_course relisait la table courses par identifiant et ne voyait pas cette ligne en cours de
-- création. La règle de lecture des parcours lit donc directement les colonnes de la ligne.
-- (Les modules, contenus et quiz gardent can_access_course : leur parcours existe déjà quand on les crée.)
-- À appliquer dans Supabase (SQL Editor) après 0008. Sans danger si lancé deux fois.

drop policy if exists "courses_select" on public.courses;
create policy "courses_select" on public.courses for select to authenticated
  using (
    organization_id = public.current_org_id()
    and (public.is_staff() or (status = 'published' and public.is_enrolled(id)))
  );
