"""Local entry point: python app.py"""
import uvicorn

from scripts.constants import app_configuration

if __name__ == "__main__":
    uvicorn.run("main:app", host=app_configuration.HOST, port=app_configuration.PORT, reload=True)
