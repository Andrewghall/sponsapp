SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'line_items' AND column_name LIKE '%pass2%';
