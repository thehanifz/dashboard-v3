"""
fix_null_status.py
Script untuk handle record dengan Status Pekerjaan NULL/kosong.
Set Status PA dan Kategori PA berdasarkan logika default.
"""
import asyncio
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.db.models import PARecord

DB_URL_SYNC = os.getenv("DB_URL_SYNC")
if not DB_URL_SYNC:
    raise ValueError("DB_URL_SYNC tidak ditemukan di .env!")

DATABASE_URL = DB_URL_SYNC.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
print(f"\n📌 Database: {DATABASE_URL.split('@')[-1].split('/')[0]}/{DATABASE_URL.split('/')[-1]}\n")


async def fix_null_status():
    """Handle record dengan Status Pekerjaan NULL."""
    
    print("=" * 80)
    print("FIX NULL STATUS PEKERJAAN")
    print("=" * 80)
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            
            # Analisis record NULL
            print("\n📊 Analisis record dengan Status Pekerjaan NULL...")
            
            result = await session.execute(
                select(
                    PARecord.status_pa,
                    PARecord.kategori_status,
                    text("COUNT(*) as count")
                )
                .where(
                    (PARecord.kategori_progres == None) |
                    (PARecord.kategori_progres == "")
                )
                .group_by(PARecord.status_pa, PARecord.kategori_status)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            total_null = sum(count for _, _, count in rows)
            print(f"\n   Total record NULL: {total_null:,}")
            print("\n   Distribusi Status PA:")
            for status_pa, kategori_pa, count in rows[:10]:
                print(f"     - Status PA: '{status_pa}', Kategori PA: '{kategori_pa}': {count:,}")
            
            # Konfirmasi
            print("\n" + "-" * 80)
            print("\n💡 Rencana:")
            print("   • Record NULL dengan Status PA = 'Done BAI' → Set Kategori PA = 'Done BAI'")
            print("   • Record NULL dengan Status PA = 'PA Cancel' → Set Kategori PA = 'PA Cancel'")
            print("   • Record NULL lainnya → Set Kategori PA = 'On Progress'")
            print("   • Status Pekerjaan tetap NULL (tidak dipaksa isi)")
            
            confirm = input("\n✅ Lanjutkan? (y/n): ").strip().lower()
            if confirm != 'y':
                print("❌ Batal.")
                return
            
            # Update
            print("\n⏳ Updating...")
            
            # 1. Done BAI
            result = await session.execute(
                update(PARecord)
                .where(
                    (PARecord.kategori_progres == None) | (PARecord.kategori_progres == "")
                )
                .where(PARecord.status_pa == "Done BAI")
                .values(
                    kategori_status="Done BAI",
                    updated_at=datetime.now()
                )
            )
            done_count = result.rowcount
            print(f"   ✅ Done BAI: {done_count:,} record")
            
            # 2. PA Cancel
            result = await session.execute(
                update(PARecord)
                .where(
                    (PARecord.kategori_progres == None) | (PARecord.kategori_progres == "")
                )
                .where(PARecord.status_pa == "PA Cancel")
                .values(
                    kategori_status="PA Cancel",
                    updated_at=datetime.now()
                )
            )
            cancel_count = result.rowcount
            print(f"   ✅ PA Cancel: {cancel_count:,} record")
            
            # 3. Lainnya → On Progress
            result = await session.execute(
                update(PARecord)
                .where(
                    (PARecord.kategori_progres == None) | (PARecord.kategori_progres == "")
                )
                .where(
                    (PARecord.status_pa != "Done BAI") &
                    (PARecord.status_pa != "PA Cancel")
                )
                .values(
                    kategori_status="On Progress",
                    updated_at=datetime.now()
                )
            )
            progress_count = result.rowcount
            print(f"   ✅ On Progress: {progress_count:,} record")
            
            await session.commit()
            
            # Verifikasi
            print("\n✅ Update selesai!")
            print(f"   Total: {done_count + cancel_count + progress_count:,} record")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Fix NULL Status Pekerjaan\n")
    asyncio.run(fix_null_status())
