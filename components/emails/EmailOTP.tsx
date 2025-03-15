import { 
	Html, 
	Head, 
	Body, 
	Container, 
	Section, 
	Text, 
	Heading, 
	Hr, 
  } from '@react-email/components';
  
  interface OTPEmailProps {
	otp: string;
	message?: string;
  }
  
  export const OTPEmail = ({ 
	otp = '123456', 
	message = 'Your verification code is valid for 10 minutes.' 
  }: OTPEmailProps) => {
	return (
	  <Html>
		<Head />
		<Body style={{ 
		  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		  backgroundColor: '#f6f9fc',
		  margin: '0',
		  padding: '0'
		}}>
		  <Container style={{
			backgroundColor: '#ffffff',
			margin: '40px auto',
			padding: '20px',
			maxWidth: '560px',
			borderRadius: '8px',
			boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
		  }}>
			<Section>
			  <Heading style={{
				color: '#333',
				fontSize: '24px',
				fontWeight: 'bold',
				textAlign: 'center',
				margin: '30px 0'
			  }}>
				Your Verification Code
			  </Heading>
			  <Hr style={{ borderColor: '#e6ebf1', margin: '20px 0' }} />
			  <Text style={{ color: '#555', fontSize: '16px', lineHeight: '24px' }}>
				Please use the following verification code to complete your registration:
			  </Text>
			  <Section style={{ 
				backgroundColor: '#f4f7ff', 
				padding: '12px', 
				borderRadius: '4px', 
				margin: '20px 0',
				textAlign: 'center' 
			  }}>
				<Text style={{ 
				  fontFamily: 'monospace', 
				  fontSize: '32px', 
				  fontWeight: 'bold',
				  letterSpacing: '4px',
				  color: '#333'
				}}>
				  {otp}
				</Text>
			  </Section>
			  <Text style={{ color: '#555', fontSize: '14px', fontStyle: 'italic' }}>
				{message}
			  </Text>
			  <Hr style={{ borderColor: '#e6ebf1', margin: '20px 0' }} />
			  <Text style={{ color: '#8898aa', fontSize: '12px', textAlign: 'center' }}>
				If you did not request this code, please ignore this email.
			  </Text>
			</Section>
		  </Container>
		</Body>
	  </Html>
	);
  };
  
  export default OTPEmail;