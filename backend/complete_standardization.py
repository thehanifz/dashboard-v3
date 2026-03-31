"""
complete_standardization.py
Script lengkap untuk standarisasi data:
1. Standarisasi "Detail Progres" - hapus prefix angka
2. Update "Status PA" & "Kategori PA" berdasarkan "Status Pekerjaan"
3. Handle nilai "Tidak Diketahui" / kosong
"""
import asyncio
import os
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


# ── 1. MAPPING DETAIL PROGRES (hapus prefix angka) ─────────────────────────────
DETAIL_MAPPING = {
    # Need Cancel
    "1. Confirmed by Sales": "Confirmed by Sales",
    "2. Confirmed by User": "Confirmed by User",
    "3. RAB Besar": "RAB Besar",
    "4. Relokasi": "Relokasi",
    "5. Pergantian PA": "Pergantian PA",
    "6. Kesalahan Administrasi": "Kesalahan Administrasi",
    "7. Tidak Tercover": "Tidak Tercover",
    
    # Need Dispose
    "1. Need Dispose": "Need Dispose",
    
    # Survey
    "1. Penjadwalan Survey": "Penjadwalan Survey",
    "2. On Progres Survey": "On Progres Survey",
    "3. Koorinasi Detail Layanan dengan Sales": "Koorinasi Detail Layanan dengan Sales",
    
    # Kendala
    "1. Menunggu Konfirmasi Sales": "Menunggu Konfirmasi Sales",
    "2. Menunggu Material SDWAN": "Menunggu Material SDWAN",
    "3. Kesalahan Administrasi": "Kesalahan Administrasi",
    "4. Menunggu Konfirmasi Jadwal User": "Menunggu Konfirmasi Jadwal User",
    "5. Menunggu Perizinan User": "Menunggu Perizinan User",
    
    # PA Lain - Lain
    "1. On Progres Pengadaan": "On Progres Pengadaan",
    "2. PA Administrasi": "PA Administrasi",
    "3. Menunggu Jadwal Delivery": "Menunggu Jadwal Delivery",
    "4. Originating": "Originating",
    
    # Reservasi Material
    "1. Pengajuan Change RAB": "Pengajuan Change RAB",
    "2. Menunggu Approval RAB": "Menunggu Approval RAB",
    "3. Need Pickup Material": "Need Pickup Material",
    
    # Penarikan
    "1. On Progres Penarikan": "On Progres Penarikan",
    
    # Tracing Core
    "1. Tracing Core": "Tracing Core",
    
    # Test Commissioning
    "1. Penjadwalan Testcom": "Penjadwalan Testcom",
    "2. Menunggu Jadwal Testcom": "Menunggu Jadwal Testcom",
    "3. Waiting Permit PLN untuk Integrasi": "Waiting Permit PLN untuk Integrasi",
    "4. On Progres Provisioning": "On Progres Provisioning",
    "5. On Progres Testcom": "On Progres Testcom",
    "6. On Progres Integrasi": "On Progres Integrasi",
    
    # BAI
    "1. Menunggu Feedback BAI": "Menunggu Feedback BAI",
    "2. Need Upload BAI": "Need Upload BAI",
    "3. PA Administrasi": "PA Administrasi",
    "4. Revisi BAI": "Revisi BAI",
    
    # Done BAI
    "1. Done BAI": "Done BAI",
    
    # PA Cancel
    "1. PA Cancel": "PA Cancel",
}

# ── 2. MAPPING STATUS PEKERJAAN → STATUS PA & KATEGORI PA ─────────────────────
# Berdasarkan sheet Opsi
STATUS_PA_MAPPING = {
    "Need Cancel": "On Progress",
    "Need Dispose": "On Progress",
    "Survey": "On Progress",
    "Kendala": "On Progress",
    "PA Lain - Lain": "On Progress",
    "Reservasi Material": "On Progress",
    "Penarikan": "On Progress",
    "Tracing Core": "On Progress",
    "Test Commissioning": "On Progress",
    "BAI": "On Progress",
    "Done BAI": "Done BAI",
    "PA Cancel": "PA Cancel",
}

# KATEGORI PA = STATUS PEKERJAAN (sama)
KATEGORI_PA_MAPPING = STATUS_PA_MAPPING


async def complete_standardization():
    """Standarisasi lengkap Detail Progres, Status PA, dan Kategori PA."""
    
    print("=" * 80)
    print("STANDARISASI LENGKAP")
    print("=" * 80)
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            
            # ═══════════════════════════════════════════════════════════════════
            # 1. STANDARISASI DETAIL PROGRES
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            print("1️⃣  STANDARISASI DETAIL PROGRES")
            print("=" * 80)
            
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(PARecord.detail_progres.in_(list(DETAIL_MAPPING.keys())))
                .group_by(PARecord.detail_progres)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            total_detail = sum(count for _, count in rows)
            
            if total_detail > 0:
                print(f"\n📋 Ditemukan {len(rows)} nilai Detail Progres lama")
                print(f"   Total record: {total_detail:,} record")
                print("\n   Detail (top 10):")
                for old_val, count in rows[:10]:
                    new_val = DETAIL_MAPPING.get(old_val, old_val)
                    print(f"     - '{old_val}' ({count:,}) → '{new_val}'")
                if len(rows) > 10:
                    print(f"     ... dan {len(rows) - 10} nilai lainnya")
            else:
                print("\n✅ Detail Progres sudah standar (tanpa prefix)")
            
            # ═══════════════════════════════════════════════════════════════════
            # 2. ANALISIS STATUS PA & KATEGORI PA YANG TIDAK SESUAI
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            print("2️⃣  ANALISIS STATUS PA & KATEGORI PA")
            print("=" * 80)
            
            # Cek record yang Status PA-nya tidak sesuai dengan Status Pekerjaan
            result = await session.execute(
                select(
                    PARecord.kategori_progres,
                    PARecord.status_pa,
                    PARecord.kategori_status,
                    text("COUNT(*) as count")
                )
                .group_by(PARecord.kategori_progres, PARecord.status_pa, PARecord.kategori_status)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            print("\n📊 Distribusi Status Pekerjaan → Status PA & Kategori PA:")
            print("   (Status Pekerjaan | Status PA | Kategori PA | Count)")
            print("   " + "-" * 70)
            
            mismatch_count = 0
            for status_pek, status_pa, kategori_pa, count in rows[:20]:
                expected_status_pa = STATUS_PA_MAPPING.get(status_pek, "Unknown")
                expected_kategori_pa = KATEGORI_PA_MAPPING.get(status_pek, status_pek)
                
                is_mismatch = (status_pa != expected_status_pa or kategori_pa != expected_kategori_pa)
                marker = "⚠️ " if is_mismatch else "✅"
                
                if is_mismatch:
                    mismatch_count += count
                
                print(f"   {marker} '{status_pek}' → Status PA: '{status_pa}', Kategori PA: '{kategori_pa}' ({count:,})")
                if is_mismatch:
                    print(f"       Expected → Status PA: '{expected_status_pa}', Kategori PA: '{expected_kategori_pa}'")
            
            if len(rows) > 20:
                print(f"   ... dan {len(rows) - 20} kombinasi lainnya")
            
            print(f"\n⚠️  Total record dengan Status PA/Kategori PA tidak sesuai: {mismatch_count:,}")
            
            # ═══════════════════════════════════════════════════════════════════
            # 3. KONFIRMASI
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            confirm = input("\n✅ Lanjutkan standarisasi? (y/n): ").strip().lower()
            if confirm != 'y':
                print("❌ Batal standarisasi.")
                return
            
            # ═══════════════════════════════════════════════════════════════════
            # 4. EXECUTE UPDATE
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            print("⏳ Melakukan standarisasi...")
            print("=" * 80)
            
            total_updated_detail = 0
            total_updated_status = 0
            
            # 4a. Update Detail Progres
            print("\n📝 Update Detail Progres...")
            for old_val, new_val in DETAIL_MAPPING.items():
                result = await session.execute(
                    update(PARecord)
                    .where(PARecord.detail_progres == old_val)
                    .values(
                        detail_progres=new_val,
                        updated_at=datetime.now()
                    )
                )
                total_updated_detail += result.rowcount
            
            print(f"   ✅ Updated {total_updated_detail:,} record Detail Progres")
            
            # 4b. Update Status PA & Kategori PA berdasarkan Status Pekerjaan
            print("\n📝 Update Status PA & Kategori PA berdasarkan Status Pekerjaan...")
            
            for status_pek, expected_status_pa in STATUS_PA_MAPPING.items():
                expected_kategori_pa = KATEGORI_PA_MAPPING.get(status_pek, status_pek)
                
                result = await session.execute(
                    update(PARecord)
                    .where(PARecord.kategori_progres == status_pek)
                    .values(
                        status_pa=expected_status_pa,
                        kategori_status=expected_kategori_pa,
                        updated_at=datetime.now()
                    )
                )
                total_updated_status += result.rowcount
                print(f"   ✅ '{status_pek}' → Status PA: '{expected_status_pa}', Kategori PA: '{expected_kategori_pa}' ({result.rowcount:,})")
            
            await session.commit()
            
            # ═══════════════════════════════════════════════════════════════════
            # 5. VERIFIKASI
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            print("5️⃣  VERIFIKASI")
            print("=" * 80)
            
            # Verifikasi Detail Progres
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(PARecord.detail_progres.in_(list(DETAIL_MAPPING.keys())))
                .group_by(PARecord.detail_progres)
            )
            remaining_detail = result.all()
            
            if remaining_detail:
                print(f"\n⚠️  Masih ada {len(remaining_detail)} nilai Detail Progres lama")
            else:
                print("\n✅ Semua Detail Progres sudah distandarisasi!")
            
            # Verifikasi Status PA & Kategori PA
            result = await session.execute(
                select(
                    PARecord.kategori_progres,
                    PARecord.status_pa,
                    PARecord.kategori_status,
                    text("COUNT(*) as count")
                )
                .group_by(PARecord.kategori_progres, PARecord.status_pa, PARecord.kategori_status)
                .order_by(text("count DESC"))
            )
            rows = result.all()
            
            print("\n📊 Distribusi setelah standarisasi:")
            all_match = True
            for status_pek, status_pa, kategori_pa, count in rows[:15]:
                expected_status_pa = STATUS_PA_MAPPING.get(status_pek, "Unknown")
                expected_kategori_pa = KATEGORI_PA_MAPPING.get(status_pek, status_pek)
                
                is_match = (status_pa == expected_status_pa and kategori_pa == expected_kategori_pa)
                marker = "✅" if is_match else "⚠️ "
                
                if not is_match:
                    all_match = False
                
                print(f"   {marker} '{status_pek}' → Status PA: '{status_pa}', Kategori PA: '{kategori_pa}' ({count:,})")
            
            if len(rows) > 15:
                print(f"   ... dan {len(rows) - 15} kombinasi lainnya")
            
            if all_match:
                print("\n✅ Semua Status PA & Kategori PA sudah sesuai!")
            else:
                print("\n⚠️  Masih ada ketidaksesuaian")
            
            # ═══════════════════════════════════════════════════════════════════
            # 6. HANDLE "TIDAK DIKETAHUI"
            # ═══════════════════════════════════════════════════════════════════
            print("\n" + "=" * 80)
            print("6️⃣  ANALISIS NILAI 'TIDAK DIKETAHUI' / KOSONG")
            print("=" * 80)
            
            # Cek Status Pekerjaan yang kosong atau "Tidak Diketahui"
            result = await session.execute(
                select(PARecord.kategori_progres, text("COUNT(*) as count"))
                .where(
                    (PARecord.kategori_progres == "") | 
                    (PARecord.kategori_progres == "Tidak Diketahui") |
                    (PARecord.kategori_progres == None)
                )
                .group_by(PARecord.kategori_progres)
            )
            unknown_status = result.all()
            
            total_unknown = sum(count for _, count in unknown_status)
            
            if total_unknown > 0:
                print(f"\n⚠️  Ditemukan {total_unknown:,} record dengan Status Pekerjaan kosong/tidak diketahui")
                for val, count in unknown_status:
                    print(f"     - '{val or 'NULL'}': {count:,} record")
                print("\n💡 Rekomendasi: Cek data source (GSheet) untuk record ini")
            else:
                print("\n✅ Tidak ada Status Pekerjaan yang kosong/tidak diketahui")
            
            # Cek Detail Progres yang kosong
            result = await session.execute(
                select(PARecord.detail_progres, text("COUNT(*) as count"))
                .where(
                    (PARecord.detail_progres == "") |
                    (PARecord.detail_progres == None) |
                    (PARecord.detail_progres == "-")
                )
                .group_by(PARecord.detail_progres)
            )
            empty_detail = result.all()
            
            total_empty = sum(count for _, count in empty_detail)
            
            if total_empty > 0:
                print(f"\nℹ️  Ditemukan {total_empty:,} record dengan Detail Progres kosong/'-'")
                print("   (Ini normal - Detail Progres opsional)")
            
            print("\n" + "=" * 80)
            print("✅ STANDARISASI SELESAI")
            print("=" * 80)
            
            # Summary
            print("\n📊 RINGKASAN:")
            print(f"   • Detail Progres diupdate: {total_updated_detail:,} record")
            print(f"   • Status PA & Kategori PA diupdate: {total_updated_status:,} record")
            print(f"   • Record dengan Status Pekerjaan kosong: {total_unknown:,}")
            print(f"   • Record dengan Detail Progres kosong: {total_empty:,}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    print("\n🚀 Script Standarisasi Lengkap")
    print("=" * 80)
    print("Script ini akan:")
    print("  1. Standarisasi 'Detail Progres' (hapus prefix angka)")
    print("  2. Update 'Status PA' & 'Kategori PA' berdasarkan 'Status Pekerjaan'")
    print("  3. Analisis nilai 'Tidak Diketahui' / kosong")
    print("=" * 80 + "\n")
    
    asyncio.run(complete_standardization())
