-- M5: 스케줄(pg_cron)과 Edge Function 호출(pg_net) 확장
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
