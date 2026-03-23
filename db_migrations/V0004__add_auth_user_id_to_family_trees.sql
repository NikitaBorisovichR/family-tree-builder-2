-- Добавляем auth_user_id в family_trees
ALTER TABLE t_p57451291_family_tree_builder_.family_trees
  ADD COLUMN IF NOT EXISTS auth_user_id INTEGER REFERENCES t_p57451291_family_tree_builder_.auth_users(id);

-- Заполняем auth_user_id через JOIN по email
UPDATE t_p57451291_family_tree_builder_.family_trees ft
SET auth_user_id = au.id
FROM t_p57451291_family_tree_builder_.users u
JOIN t_p57451291_family_tree_builder_.auth_users au ON au.email = u.email
WHERE ft.user_id = u.id AND ft.auth_user_id IS NULL;

-- Добавляем email в auth_users если его нет в users (для новых пользователей которые регались только через auth)
-- Убеждаемся что у auth_users есть индекс по email
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON t_p57451291_family_tree_builder_.auth_users(email);
CREATE INDEX IF NOT EXISTS idx_family_trees_auth_user_id ON t_p57451291_family_tree_builder_.family_trees(auth_user_id);
