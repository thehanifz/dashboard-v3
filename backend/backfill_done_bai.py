"""
backfill_done_bai.py
Script untuk update massal:
- Untuk semua record dengan status_pa = "Done BAI"
- Set kategori_status = "Done BAI"
- Set kategori_progres (Status Pekerjaan) = "Done BAI"
- Set detail_progres (Detail Progres) = "Done BAI"
"""
import asyncio
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Import model
from app.db.models import PARecord

# Database URL dari .env
DB_URL_SYNC = os.getenv("DB_URL_SYNC")

if not DB_URL_SYNC:
    raise ValueError("DB_URL_SYNC tidak ditemukan di .env!")

# Ubah psycopg2 ke asyncpg untuk async engine
DATABASE_URL = DB_URL_SYNC.replace("postgresql+psycopg2://", "postgresql+asyncpg://")

print(f"\n📌 Menggunakan database: {DATABASE_URL.split('@')[-1].split('/')[0]}/{DATABASE_URL.split('/')[-1]}\n")


async def backfill_done_bai():
    """Update semua record dengan status_pa = 'Done BAI'."""
    
    print("=" * 60)
    print("BACKFILL: Update record dengan status_pa = 'Done BAI'")
    print("=" * 60)
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # 1. Hitung berapa record yang akan diupdate
            result = await session.execute(
                select(PARecord).where(PARecord.status_pa == "Done BAI")
            )
            records_to_update = result.scalars().all()
            total_records = len(records_to_update)
            
            print(f"\n📊 Ditemukan {total_records} record dengan status_pa = 'Done BAI'")
            
            if total_records == 0:
                print("✅ Tidak ada record yang perlu diupdate.")
                return
            
            # Tampilkan preview beberapa record
            if total_records > 0:
                print("\n📋 Preview record yang akan diupdate:")
                print("-" * 60)
                for i, rec in enumerate(records_to_update[:5], 1):
                    print(f"  {i}. ID PA: {rec.id_pa}")
                    print(f"     - status_pa: {rec.status_pa}")
                    print(f"     - kategori_status (sebelum): {rec.kategori_status}")
                    print(f"     - kategori_progres (sebelum): {rec.kategori_progres}")
                    print(f"     - detail_progres (sebelum): {rec.detail_progres}")
                    print()
                
                if total_records > 5:
                    print(f"  ... dan {total_records - 5} record lainnya")
            
            # Konfirmasi
            print("-" * 60)
            confirm = input("\n✅ Lanjutkan update? (y/n): ").strip().lower()
            if confirm != 'y':
                print("❌ Batal update.")
                return
            
            # 2. Execute bulk update
            print("\n⏳ Melakukan update...")
            
            stmt = update(PARecord).where(
                PARecord.status_pa == "Done BAI"
            ).values(
                kategori_status="Done BAI",
                kategori_progres="Done BAI",
                detail_progres="Done BAI",
                updated_at=datetime.now()
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            updated_count = result.rowcount
            
            print(f"\n✅ Berhasil update {updated_count} record!")
            
            # 3. Verifikasi
            print("\n🔍 Verifikasi hasil update...")
            verify_result = await session.execute(
                select(PARecord).where(PARecord.status_pa == "Done BAI")
            )
            verified_records = verify_result.scalars().all()
            
            all_correct = True
            for rec in verified_records[:5]:  # Preview 5 record pertama
                if (rec.kategori_status != "Done BAI" or 
                    rec.kategori_progres != "Done BAI" or 
                    rec.detail_progres != "Done BAI"):
                    all_correct = False
                    print(f"  ❌ ID PA {rec.id_pa}: Update tidak lengkap!")
            
            if all_correct:
                print(f"  ✅ Semua {len(verified_records)} record terupdate dengan benar!")
            
            print("\n" + "=" * 60)
            print("BACKFILL SELESAI")
            print("=" * 60)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Script Backfill Done BAI")
    print("Script ini akan mengupdate kolom kategori_status, kategori_progres,")
    print("dan detail_progres menjadi 'Done BAI' untuk semua record dengan")
    print("status_pa = 'Done BAI'\n")
    
    asyncio.run(backfill_done_bai())
