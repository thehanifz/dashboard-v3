"""
standardize_status_pekerjaan.py
Script untuk standarisasi nilai "Status Pekerjaan" agar sesuai dengan sheet Opsi.

Mapping nilai lama (dengan prefix angka) → nilai baru (tanpa prefix):
- "8. PA Lain - Lain" → "PA Lain - Lain"
- "9. Need Cancel" → "Need Cancel"
- "7. Kendala" → "Kendala"
- dll.
"""
import asyncio
import os
import re
from datetime import datetime
from dotenv import load_dotenv

# Load .env file
load_dotenv()

from sqlalchemy import select, update, text
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


# Mapping nilai lama → nilai baru (berdasarkan sheet Opsi)
STATUS_MAPPING = {
    # Dengan angka prefix
    "8. PA Lain - Lain": "PA Lain - Lain",
    "9. Need Cancel": "Need Cancel",
    "7. Kendala": "Kendala",
    "5. Test Commissioning": "Test Commissioning",
    "6. BAI": "BAI",
    "0. Need Dispose": "Need Dispose",
    "3. Penarikan": "Penarikan",
    "2. Reservasi Material": "Reservasi Material",
    "1. Survey": "Survey",
    "4. Tracing Core": "Tracing Core",
    
    # Variasi lain yang mungkin ada
    "8. PA Lain-Lain": "PA Lain - Lain",
    "9. Need  Cancel": "Need Cancel",
    "7. kendala": "Kendala",
    "5. Test Commissioning": "Test Commissioning",
    "6. Bai": "BAI",
    "0. Need dispose": "Need Dispose",
    "3. penarikan": "Penarikan",
    "2. reservasi material": "Reservasi Material",
    "1. survey": "Survey",
    "4. tracing core": "Tracing Core",
}


async def standardize_status_pekerjaan():
    """Standarisasi nilai Status Pekerjaan agar sesuai sheet Opsi."""
    
    print("=" * 70)
    print("STANDARISASI STATUS PEKERJAAN")
    print("=" * 70)
    print("\nMapping yang akan diterapkan:")
    print("-" * 70)
    for old, new in STATUS_MAPPING.items():
        print(f"  '{old}' → '{new}'")
    print("-" * 70)
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # 1. Hitung berapa record yang akan diupdate per kategori
            print("\n📊 Analisis data existing...")
            
            result = await session.execute(
                select(PARecord.kategori_progres, text("COUNT(*) as count"))
                .where(PARecord.kategori_progres.in_(list(STATUS_MAPPING.keys())))
                .group_by(PARecord.kategori_progres)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            total_to_update = sum(count for _, count in rows)
            
            if total_to_update == 0:
                print("✅ Tidak ada record yang perlu distandarisasi.")
                print("\nNilai Status Pekerjaan sudah sesuai dengan sheet Opsi.")
                return
            
            print(f"\n📋 Ditemukan {len(rows)} nilai lama yang perlu diupdate")
            print(f"   Total record: {total_to_update:,} record")
            print("\n   Detail:")
            for old_val, count in rows:
                new_val = STATUS_MAPPING.get(old_val, old_val)
                print(f"     - '{old_val}' ({count:,} record) → '{new_val}'")
            
            # Konfirmasi
            print("\n" + "-" * 70)
            confirm = input("\n✅ Lanjutkan standarisasi? (y/n): ").strip().lower()
            if confirm != 'y':
                print("❌ Batal standarisasi.")
                return
            
            # 2. Execute update per mapping
            print("\n⏳ Melakukan standarisasi...")
            
            total_updated = 0
            for old_val, new_val in STATUS_MAPPING.items():
                result = await session.execute(
                    update(PARecord)
                    .where(PARecord.kategori_progres == old_val)
                    .values(
                        kategori_progres=new_val,
                        updated_at=datetime.now()
                    )
                )
                total_updated += result.rowcount
            
            await session.commit()
            
            print(f"\n✅ Berhasil menstandarisasi {total_updated:,} record!")
            
            # 3. Verifikasi
            print("\n🔍 Verifikasi hasil standarisasi...")
            
            # Cek apakah masih ada nilai lama
            result = await session.execute(
                select(PARecord.kategori_progres, text("COUNT(*) as count"))
                .where(PARecord.kategori_progres.in_(list(STATUS_MAPPING.keys())))
                .group_by(PARecord.kategori_progres)
            )
            remaining = result.all()
            
            if remaining:
                print(f"  ⚠️  Masih ada {len(remaining)} nilai lama yang tersisa:")
                for val, count in remaining:
                    print(f"     - '{val}': {count:,} record")
            else:
                print("  ✅ Semua nilai lama sudah terstandarisasi!")
            
            # Tampilkan distribusi nilai baru
            print("\n📊 Distribusi Status Pekerjaan setelah standarisasi:")
            result = await session.execute(
                select(PARecord.kategori_progres, text("COUNT(*) as count"))
                .where(PARecord.kategori_progres.in_(list(STATUS_MAPPING.values())))
                .group_by(PARecord.kategori_progres)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            for val, count in rows[:15]:  # Top 15
                print(f"  - '{val}': {count:,} record")
            
            if len(rows) > 15:
                print(f"  ... dan {len(rows) - 15} nilai lainnya")
            
            print("\n" + "=" * 70)
            print("STANDARISASI SELESAI")
            print("=" * 70)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Script Standarisasi Status Pekerjaan")
    print("Script ini akan menstandarisasi nilai 'Status Pekerjaan' agar sesuai")
    print("dengan sheet Opsi (tanpa prefix angka).\n")
    
    asyncio.run(standardize_status_pekerjaan())
