from pydantic import BaseModel

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str

class AdminResponse(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True
