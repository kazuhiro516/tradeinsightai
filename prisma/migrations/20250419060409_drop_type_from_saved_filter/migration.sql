-- typeカラムが存在する場合のみ削除
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'saved_filter'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE "saved_filter" DROP COLUMN "type";
    END IF;
END $$;

-- インデックスが存在する場合のみ削除
DROP INDEX IF EXISTS "saved_filter_type_idx";
