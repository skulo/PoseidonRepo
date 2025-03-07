
class FileManager:
    def __init__(self):
        #from dotenv import load_dotenv

        #load_dotenv()
        self.files_dir = "test"

        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region_name= os.getenv('AWS_REGION_NAME')
        self.s3_bucket_name = os.getenv('S3_BUCKET_NAME')

        if self.aws_access_key_id is not None:
            self.is_local_storage = False
            self.s3 = boto3.client('s3', aws_access_key_id=self.aws_access_key_id, aws_secret_access_key=self.aws_secret_access_key, region_name=self.region_name)
        else:
            self.is_local_storage = True
    
    def save_file(self, filename:str, file):
        
        if self.is_local_storage:
            file_path = os.path.join(self.files_dir, filename)
            with open(file_path, "wb") as f:
                f.write(await file.read())
        else:
            s3.upload_fileobj(file.file, self.s3_bucket_name, filename)
            return f"https://{self.s3_bucket_name}.s3.{self.region_name}.amazonaws.com/{filename}"


    
