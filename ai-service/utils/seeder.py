import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random
import faker

# Charger les variables d'environnement
load_dotenv()

# Configuration de la base de données
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "telecom_platform")

HASHED_PASSWORD = "$10$DzP8kTaHSihh6FgUhEORc.zE9wRa3pJ7bF07DSpQ6czBhM/fWcM9u"

fake = faker.Faker("fr_FR")


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return connection if connection.is_connected() else None
    except Error as e:
        print(f"❌ Erreur connexion: {e}")
        return None


def seed_data():
    connection = get_db_connection()
    if not connection: return
    cursor = connection.cursor(dictionary=True)

    try:
        # 1. Récupérer les agents existants
        cursor.execute("SELECT id FROM users WHERE role IN ('admin', 'billing_agent', 'recovery_agent')")
        agents = cursor.fetchall()
        if not agents:
            print("❌ Erreur: Aucun agent trouvé en base.")
            return
        agent_ids = [a['id'] for a in agents]

        # 2. Créer 50 nouveaux clients
        print("⏳ Création de 50 nouveaux clients...")
        new_client_ids = []
        for _ in range(50):
            name = fake.name()
            email = fake.unique.email()
            # Table users (Correction des noms de colonnes ici)
            cursor.execute(
                "INSERT INTO users (name, email, role, is_active, created_at, updated_at, password) VALUES (%s, %s, 'client', 1, NOW(), NOW(), %s)",
                (name, email, HASHED_PASSWORD)
            )
            user_id = cursor.lastrowid

            # Table clients
            cursor.execute(
                """INSERT INTO clients (user_id, company_name, phone, address, city, postal_code, country, siret, 
                contract_type, credit_limit, status, created_at, updated_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', NOW(), NOW())""",
                (user_id, fake.company(), fake.phone_number(), fake.address(), fake.city(), fake.postcode(),
                 "France", fake.siret(), random.choice(['prepaid', 'postpaid', 'enterprise']),
                 random.randint(1000, 10000))
            )
            new_client_ids.append(cursor.lastrowid)

        # 3. Générer 5000 factures sur 10 ans
        print("⏳ Génération de 5000 factures (2016-2026)...")
        start_date = datetime(2016, 1, 1)

        for i in range(5000):
            days_diff = random.randint(0, (datetime(2026, 6, 28) - start_date).days)
            issue_date = start_date + timedelta(days=days_diff)
            due_date = issue_date + timedelta(days=30)

            client_id = random.choice(new_client_ids)
            billing_agent_id = random.choice(agent_ids)

            year_factor = (issue_date.year - 2016) * 0.05
            amount_ht = random.uniform(200, 3000) * (1 + year_factor)
            if issue_date.month == 12: amount_ht *= 1.2

            tva_rate = 20
            amount_ttc = amount_ht * 1.2

            status = \
            random.choices(['paid', 'overdue', 'partially_paid', 'cancelled', 'sent'], weights=[65, 15, 10, 5, 5])[0]
            amount_paid = amount_ttc if status == 'paid' else (amount_ttc * 0.4 if status == 'partially_paid' else 0)

            # Table invoices
            cursor.execute(
                """INSERT INTO invoices (invoice_number, client_id, billing_agent_id, amount_ht, tva_rate, amount_ttc, 
                amount_paid, due_date, issue_date, status, description, created_at, updated_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (f"INV-{issue_date.year}-{i + 1:05d}", client_id, billing_agent_id, amount_ht, tva_rate, amount_ttc,
                 amount_paid, due_date, issue_date, status, fake.sentence(), issue_date, issue_date)
            )
            invoice_id = cursor.lastrowid

            # Table payments
            if amount_paid > 0:
                cursor.execute(
                    """INSERT INTO payments (invoice_id, client_id, amount, payment_date, payment_method, reference, 
                    notes, recorded_by, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (invoice_id, client_id, amount_paid, issue_date + timedelta(days=random.randint(1, 15)),
                     random.choice(['bank_transfer', 'credit_card', 'check']), fake.bothify(text='PAY-####-????'),
                     "Paiement seeder", billing_agent_id, issue_date)
                )

            # Table recovery_cases
            if status == 'overdue':
                cursor.execute(
                    """INSERT INTO recovery_cases (invoice_id, client_id, recovery_agent_id, status, priority, 
                    overdue_amount, overdue_days, notes, created_at, updated_at) 
                    VALUES (%s, %s, %s, 'open', %s, %s, %s, %s, %s, %s)""",
                    (invoice_id, client_id, random.choice(agent_ids),
                     random.choice(['low', 'medium', 'high', 'critical']),
                     amount_ttc - amount_paid, random.randint(31, 100), "Dossier seeder", issue_date, issue_date)
                )

        connection.commit()
        print(f"✅ Terminé ! 50 clients et 5000 factures ajoutés.")

    except Error as e:
        print(f"❌ Erreur: {e}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    seed_data()
