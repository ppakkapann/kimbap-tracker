-- Allow custom sale locations (Notion-style tags)
alter table sales drop constraint if exists sales_channel_check;

alter table sales alter column channel drop default;
alter table sales alter column channel drop not null;

update sales
set channel = case channel
  when 'market' then 'ตลาด'
  when 'office' then 'ที่ทำงาน'
  when 'condo' then 'คอนโด'
  when 'other' then 'อื่นๆ'
  else channel
end
where channel in ('market', 'office', 'condo', 'other');
