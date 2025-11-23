import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface PasswordResetEmailProps {
  firstName: string;
  resetLink: string;
}

export function PasswordResetEmail({
  firstName,
  resetLink,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={heading}>NovaWorks</Text>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              We received a request to reset your password for your NovaWorks
              account.
            </Text>
            <Button style={button} href={resetLink}>
              Reset Password
            </Button>
            <Text style={paragraph}>
              This link will expire in <strong>30 minutes</strong> for security
              reasons.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              If you didn't request a password reset, please ignore this email.
              Your password will remain unchanged.
            </Text>
            <Text style={footer}>
              Thanks,
              <br />
              The NovaWorks Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const box = {
  padding: '0 48px',
};

const heading = {
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '48px 0 32px',
  color: '#1a1a1a',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#525252',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
  margin: '24px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
};
