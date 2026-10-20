-- Remise à zéro de la démonstration (à lancer entre deux démos, dans Supabase > SQL Editor).
-- Ne touche QUE les deux organismes fictifs de démonstration. ⚠️ Ne jamais lancer sur une base contenant de vraies données.
--
-- Ce que ça fait :
--   1. supprime les tentatives de quiz, les contenus terminés et le temps passé (les apprenants repartent de zéro) ;
--   2. remet les couleurs d'origine et retire les logos ;
--   3. supprime les parcours créés pendant une démo (ceux qui ne font pas partie du jeu de départ) ;
--   4. remet les parcours de départ dans leur état d'origine (publié / brouillon).
-- Ensuite, relance supabase/seed_tracking.sql pour retrouver l'activité fictive (les apprenants et leurs traces).
-- Si tu as ajouté des modules ou des contenus dans un parcours de départ, ils restent : supprime-les à la main.

delete from public.quiz_attempts
  where organization_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');
delete from public.content_completions
  where organization_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');
delete from public.course_time
  where organization_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');

update public.organizations set primary_color = '#1d4ed8', logo_url = null
  where id = 'a0000000-0000-4000-8000-000000000001';
update public.organizations set primary_color = '#b45309', logo_url = null
  where id = 'b0000000-0000-4000-8000-000000000002';

delete from public.courses
  where organization_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')
    and id not in (
      'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002',
      'c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004',
      'c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002');

update public.courses set status = 'published' where id in (
  'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002',
  'c1000000-0000-4000-8000-000000000004', 'c2000000-0000-4000-8000-000000000001');
update public.courses set status = 'draft' where id in (
  'c1000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000002');

-- Inscriptions (étape 10) : les apprenants de démonstration sont réinscrits aux parcours publiés de départ.
insert into public.enrollments (organization_id, course_id, learner_id)
select c.organization_id, c.id, p.id
from public.courses c
join public.profiles p on p.organization_id = c.organization_id and p.role = 'learner'
where c.status = 'published'
  and c.organization_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')
on conflict do nothing;
