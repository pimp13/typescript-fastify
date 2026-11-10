export type SsoDiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  introspection_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  scopes_supported: string[];
  code_challenge_methods_supported: string[];
};

export type SsoTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type SsoUserInfo = {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  role: string;
  permissions: string[];
  status: string;
};

export type SsoIntrospectResponse = {
  active: boolean;
  sub?: string;
  client_id?: string;
  email?: string;
  role?: string;
  scope?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  permissions?: string[];
};

export type SsoOAuthState = {
  state: string;
  codeVerifier?: string;
  returnTo?: string;
};
