from database.session import SessionLocal
from models.payment import PaymentIntent
from models.merchant import Merchant
from sqlalchemy import func

def verify_stats():
    db = SessionLocal()
    # Find merchant with data
    merchant_id = db.query(PaymentIntent.merchant_id).first()
    if not merchant_id:
        print("No payment intents found in DB")
        return
    
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id[0]).first()
    print(f"Verifying for Merchant: {merchant.name} ({merchant.id})")

    # Global Stats
    base_query = db.query(PaymentIntent).filter(PaymentIntent.merchant_id == merchant.id)
    total_all = base_query.count()
    total_succeeded = base_query.filter(PaymentIntent.status == "succeeded").count()
    total_failed = base_query.filter(PaymentIntent.status == "failed").count()
    total_volume = base_query.filter(PaymentIntent.status == "succeeded").with_entities(func.sum(PaymentIntent.amount)).scalar() or 0
    
    # Paginated Query (Page 1, Limit 5)
    limit = 5
    paginated_intents = base_query.limit(limit).all()
    paginated_count = len(paginated_intents)
    paginated_volume = sum(p.amount for p in paginated_intents if p.status == "succeeded")

    print(f"\n--- Statistics Analysis ---")
    print(f"Global Total Intents: {total_all}")
    print(f"Global Succeeded:    {total_succeeded}")
    print(f"Global Failed:       {total_failed}")
    print(f"Global Total Volume: {total_volume}")
    
    print(f"\n--- Paginated (Page 1, Limit {limit}) ---")
    print(f"Paginated Intent Count: {paginated_count}")
    print(f"Paginated Volume sum:   {paginated_volume}")

    if total_all > paginated_count:
        print(f"\nSUCCESS: Global stats ({total_all}) correctly exceed paginated count ({paginated_count}).")
    else:
        print(f"\nNOTE: Global stats ({total_all}) equal paginated count ({paginated_count}) because total data is small.")

if __name__ == "__main__":
    verify_stats()
