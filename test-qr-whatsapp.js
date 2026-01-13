// Teste público via status endpoint que não requer auth
console.log('🧪 TESTE STATUS - ENDPOINT PÚBLICO');

const testStatus = async () => {
  try {
    const response = await fetch('http://72.60.14.172:3001/api/whatsapp/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📄 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('💥 Erro:', error);
  }
};

testStatus();