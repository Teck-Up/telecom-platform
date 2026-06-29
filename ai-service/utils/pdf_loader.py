# utils / pdf_loader .py
from langchain_community . document_loaders import PyPDFLoader
from langchain . text_splitter import RecursiveCharacterTextSplitter
from langchain_community . vectorstores import Chroma
from langchain_community . embeddings import HuggingFaceEmbeddings
import os
from dotenv import load_dotenv

# Charger les variables d’ environnement
load_dotenv ()

def load_and_process_pdf ( pdf_path ):
    """
    Charge un document PDF, le divise en chunks et crée une base de
    données vectorielle avec ChromaDB.

    Args:
        pdf_path (str): Chemin vers le fichier PDF à traiter

    Returns:
        Chroma: Base de données vectorielle contenant les chunks du document
    """

    print(f"Chargement du PDF : {pdf_path}")

    # Étape 1 : Charger le PDF avec PyPDFLoader
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    print(f"PDF chargé avec succès : {len(documents)} pages")

    # Étape 2 : Diviser le texte en chunks plus petits pour un meilleur traitement
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,  # Taille de chaque chunk en caractères
        chunk_overlap=200,  # Chevauchement entre les chunks pour maintenir le contexte
        length_function=len
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Document divisé en {len(chunks)} chunks")

    # Étape 3 : Initialiser le modèle d’embedding MinLM
    # Nous utilisons le modèle all-MiniLM-L6-v2 qui offre un bon équilibre entre performance et rapidité
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'}  # Utiliser CPU pour la compatibilité
    )
    print("Modèle d’embedding MinLM initialisé")

    # Étape 4 : Créer une base de données vectorielle avec ChromaDB
    # ChromaDB stockera les embeddings et permettra des recherches sémantiques efficaces
    db_directory = "./data/chroma_db"
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=db_directory  # Stockage persistant des embeddings
    )

    # Persister la base de données pour une utilisation future
    vector_store.persist()
    print(f"Base de données vectorielle ChromaDB créée et persistée dans {db_directory}")

    return vector_store
