import os
import io
from google.cloud import storage
import boto3
from dotenv import load_dotenv

# Load environment variables from the backend .env file
# Make sure to run this script from the project root or adjust the path to .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)

GCP_BUCKET_NAME = os.getenv('GCP_STORAGE_BUCKET', 'bpm-documentos-adjuntos-798ae')
AWS_BUCKET_NAME = os.getenv('AWS_S3_BUCKET')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-2')
AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')

def migrate_gcs_to_s3():
    if not all([AWS_BUCKET_NAME, AWS_ACCESS_KEY, AWS_SECRET_KEY]):
        print("Error: Missing AWS S3 configuration in .env file.")
        return

    print(f"Starting migration from GCS bucket '{GCP_BUCKET_NAME}' to AWS S3 bucket '{AWS_BUCKET_NAME}'...")

    # Initialize GCS client
    # This automatically uses GOOGLE_APPLICATION_CREDENTIALS if set in environment
    try:
        gcs_client = storage.Client()
        gcs_bucket = gcs_client.bucket(GCP_BUCKET_NAME)
    except Exception as e:
        print(f"Error initializing Google Cloud Storage client: {e}")
        return

    # Initialize AWS S3 client
    try:
        s3_client = boto3.client(
            's3',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY
        )
    except Exception as e:
        print(f"Error initializing AWS S3 client: {e}")
        return

    # List all blobs in GCS
    blobs = list(gcs_bucket.list_blobs())
    total_blobs = len(blobs)
    print(f"Found {total_blobs} files to migrate.")

    success_count = 0
    error_count = 0

    for index, blob in enumerate(blobs, 1):
        try:
            print(f"[{index}/{total_blobs}] Migrating '{blob.name}' ({blob.size} bytes)...")
            
            # Download file from GCS into memory
            file_data = blob.download_as_bytes()
            
            # Upload file to S3
            s3_client.put_object(
                Bucket=AWS_BUCKET_NAME,
                Key=blob.name,
                Body=file_data,
                ContentType=blob.content_type if blob.content_type else 'application/octet-stream'
            )
            success_count += 1
            print(f"    -> Successfully migrated '{blob.name}'.")
        except Exception as e:
            error_count += 1
            print(f"    -> Error migrating '{blob.name}': {e}")

    print("\nMigration Summary:")
    print("------------------")
    print(f"Total files: {total_blobs}")
    print(f"Successfully migrated: {success_count}")
    print(f"Failed: {error_count}")
    print("------------------")

if __name__ == "__main__":
    print("Ensure you have installed required python packages: pip install google-cloud-storage boto3 python-dotenv")
    migrate_gcs_to_s3()
