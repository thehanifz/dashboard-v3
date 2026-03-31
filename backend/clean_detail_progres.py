"""
clean_detail_progres.py
Script untuk menghapus prefix angka dari Detail Progres.
Contoh: "8.a On Progres Pengadaan" → "On Progres Pengadaan"
"""
import asyncio
import os
import re
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


def remove_prefix(value: str) -> str:
    """Hapus prefix angka + huruf + spasi dari nilai Detail Progres."""
    if not value:
        return value
    
    # Pattern: angka + huruf + spasi (misal: "8.a ", "0. ", "12.b ")
    pattern = r'^\d+\.?[a-z]?\s+'
    result = re.sub(pattern, '', value, flags=re.IGNORECASE)
    return result.strip()


async def clean_detail_progres():
    """Bersihkan prefix angka dari Detail Progres."""
    
    print("=" * 80)
    print("CLEAN DETAIL PROGRES - HAPUS PREFIX ANGKA")
    print("=" * 80)
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            
            # 1. Analisis nilai yang masih pakai prefix
            print("\n📊 Analisis nilai Detail Progres dengan prefix...")
            
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(PARecord.detail_progres.op('~')('^[0-9]+\\.?[a-z]?\\s'))
                .group_by(PARecord.detail_progres)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            total_with_prefix = sum(count for _, count in rows)
            
            if total_with_prefix == 0:
                print("\n✅ Tidak ada Detail Progres dengan prefix angka!")
                return
            
            print(f"\n📋 Ditemukan {len(rows)} nilai unik dengan prefix")
            print(f"   Total record: {total_with_prefix:,} record")
            print("\n   Detail (top 20):")
            
            # Build mapping
            mapping = {}
            for old_val, count in rows[:20]:
                new_val = remove_prefix(old_val)
                mapping[old_val] = new_val
                print(f"     '{old_val}' ({count:,}) → '{new_val}'")
            
            if len(rows) > 20:
                print(f"     ... dan {len(rows) - 20} nilai lainnya")
            
            # Konfirmasi
            print("\n" + "-" * 80)
            confirm = input("\n✅ Lanjutkan cleaning? (y/n): ").strip().lower()
            if confirm != 'y':
                print("❌ Batal cleaning.")
                return
            
            # 2. Execute update
            print("\n⏳ Cleaning Detail Progres...")
            
            total_updated = 0
            for old_val, new_val in mapping.items():
                result = await session.execute(
                    update(PARecord)
                    .where(PARecord.detail_progres == old_val)
                    .values(
                        detail_progres=new_val,
                        updated_at=datetime.now()
                    )
                )
                total_updated += result.rowcount
            
            await session.commit()
            
            print(f"\n✅ Berhasil membersihkan {total_updated:,} record!")
            
            # 3. Verifikasi
            print("\n🔍 Verifikasi...")
            
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(PARecord.detail_progres.op('~')('^[0-9]+\\.?[a-z]?\\s'))
                .group_by(PARecord.detail_progres)
            )
            remaining = result.all()
            
            if remaining:
                print(f"\n⚠️  Masih ada {len(remaining)} nilai dengan prefix:")
                for val, count in remaining[:10]:
                    print(f"     '{val}': {count:,}")
                if len(remaining) > 10:
                    print(f"     ... dan {len(remaining) - 10} nilai lainnya")
            else:
                print("\n✅ SEMUA DETAIL PROGRES SUDAH BERSIH DARI PREFIX!")
            
            # Tampilkan distribusi setelah cleaning
            print("\n📊 Distribusi Detail Progres setelah cleaning (Top 15):")
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(PARecord.detail_progres != None)
                .where(PARecord.detail_progres != '')
                .group_by(PARecord.detail_progres)
                .order_by(text("count DESC"))
                .limit(15)
            )
            rows = result.all()
            
            for val, count in rows:
                print(f"  {count:>7,} | {val}")
            
            print("\n" + "=" * 80)
            print("✅ CLEANING SELESAI")
            print("=" * 80)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Script Cleaning Detail Progres")
    print("=" * 80)
    print("Script ini akan menghapus prefix angka dari Detail Progres")
    print("Contoh: '8.a On Progres Pengadaan' → 'On Progres Pengadaan'")
    print("=" * 80 + "\n")
    
    asyncio.run(clean_detail_progres())
