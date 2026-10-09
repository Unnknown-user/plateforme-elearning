-- Parcours de démonstration FICTIFS (texte « lorem ipsum »). À exécuter après 0003_courses.sql.
-- Ré-exécutable : un parcours déjà présent est ignoré.

create function pg_temp.seed_course(
  p_org uuid, p_id uuid, p_title text, p_description text, p_objectives text,
  p_minutes integer, p_status public.course_status, p_modules integer, p_author uuid
) returns void language plpgsql as $$
declare
  titles text[] := array['Introduction', 'Les fondamentaux', 'Mise en pratique', 'Études de cas', 'Synthèse et évaluation'];
  lorem1 text := E'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
  lorem2 text := E'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.\n\nNemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.';
  m_id uuid;
  i integer;
begin
  insert into public.courses (id, organization_id, title, description, objectives, duration_minutes, status, created_by)
  values (p_id, p_org, p_title, p_description, p_objectives, p_minutes, p_status, p_author)
  on conflict (id) do nothing;
  if not found then return; end if;

  for i in 1..p_modules loop
    insert into public.modules (organization_id, course_id, title, position)
    values (p_org, p_id, titles[i], i) returning id into m_id;
    insert into public.contents (organization_id, module_id, type, title, body, position)
    values (p_org, m_id, 'text', 'Lorem ipsum : les idées clés', lorem1, 1);
    insert into public.contents (organization_id, module_id, type, title, url, position)
    values (p_org, m_id, 'video', 'Vidéo de présentation', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 2);
    insert into public.contents (organization_id, module_id, type, title, body, position)
    values (p_org, m_id, 'text', 'Dolor sit amet : à retenir', lorem2, 3);
  end loop;
end $$;

-- Institut Horizon Formation
select pg_temp.seed_course('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
  'Accueillir et accompagner un nouvel arrivant',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  E'Lorem ipsum dolor sit amet\nConsectetur adipiscing elit\nSed do eiusmod tempor incididunt',
  180, 'published', 3, 'a1000000-0000-4000-8000-000000000002');
select pg_temp.seed_course('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002',
  'Sécurité au travail : les bons réflexes',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  E'Duis aute irure dolor in reprehenderit\nExcepteur sint occaecat cupidatat',
  120, 'published', 4, 'a1000000-0000-4000-8000-000000000002');
select pg_temp.seed_course('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003',
  'Introduction au management d''équipe',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  E'Sed ut perspiciatis unde omnis iste natus\nNemo enim ipsam voluptatem',
  240, 'draft', 2, 'a1000000-0000-4000-8000-000000000002');
select pg_temp.seed_course('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004',
  'Communication écrite professionnelle',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  E'Lorem ipsum dolor sit amet\nUt labore et dolore magna aliqua',
  90, 'published', 3, 'a1000000-0000-4000-8000-000000000002');

-- Atelier Lumière Conseil
select pg_temp.seed_course('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000001',
  'Conduire une réunion efficace',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
  E'Totam rem aperiam eaque ipsa\nQuae ab illo inventore veritatis',
  150, 'published', 3, 'b1000000-0000-4000-8000-000000000002');
select pg_temp.seed_course('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002',
  'Gestion du temps et des priorités',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.',
  E'Neque porro quisquam est\nQui dolorem ipsum quia dolor sit amet',
  100, 'draft', 2, 'b1000000-0000-4000-8000-000000000002');
