-- 회의실 소집 상태. 관리자가 호출하면 true, 복귀시키면 false. (연출용, 엔진과 무관)
alter table employees add column in_meeting boolean not null default false;
