-- M6: 긴급 정지·예산 변경을 화면에 바로 반영하기 위해 budget_settings도 실시간 발행
alter publication supabase_realtime add table budget_settings;
