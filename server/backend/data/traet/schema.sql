BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "sources" (
	"id"	INTEGER,
	"case_type"	TEXT NOT NULL,
	"degree"	INTEGER DEFAULT NULL,
	"short_src"	TEXT NOT NULL,
	"detailed_src"	TEXT NOT NULL,
	"image_src"	TEXT NOT NULL,
	"video_src"	TEXT NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "treatments" (
	"id"	INTEGER,
	"case_type"	TEXT NOT NULL,
	"degree"	INTEGER DEFAULT NULL,
	"short_instruction"	TEXT NOT NULL,
	"detailed_instruction"	TEXT NOT NULL,
	"image_url"	TEXT NOT NULL,
	"video_url"	TEXT NOT NULL,
	"source_id"	INTEGER NOT NULL,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("source_id") REFERENCES "sources"("id")
);
COMMIT;
