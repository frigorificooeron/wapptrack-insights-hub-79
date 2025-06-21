
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Wifi, WifiOff } from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { evolutionService } from '@/services/evolutionService';
import { toast } from 'sonner';

const EvolutionApiSettings = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrError, setQrError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Configurações fixas internas - não editáveis pelo usuário
  const EVOLUTION_CONFIG = {
    instance_name: 'Herickson',
    api_key: 'your-api-key-here', // Substitua pela sua API key real
    base_url: 'https://evolutionapi.workidigital.tech'
  };

  const handleGetQRCode = async () => {
    setIsLoadingQR(true);
    setQrError('');
    setQrCode('');

    try {
      const response = await evolutionService.getQRCode(
        EVOLUTION_CONFIG.instance_name,
        EVOLUTION_CONFIG.api_key
      );

      if (response.success) {
        const qrCodeData = response.qrcode || response.code;
        if (qrCodeData) {
          setQrCode(qrCodeData);
          setIsConnected(true);
          toast.success('QR Code gerado com sucesso!');
        } else {
          setQrError('QR Code não encontrado na resposta da API');
        }
      } else {
        setQrError(response.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      setQrError(error.message || 'Erro ao gerar QR Code');
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    
    try {
      // Aqui você implementaria a lógica para desconectar da instância
      // Por enquanto, apenas simulamos a desconexão
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsConnected(false);
      setQrCode('');
      setQrError('');
      toast.success('Desconectado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao desconectar: ' + error.message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>WhatsApp Integration</span>
        </CardTitle>
        <CardDescription>
          Conecte-se ao WhatsApp para automatizar o processo de validação de leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                Status da Conexão
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? 'Conectado ao WhatsApp' : 'Desconectado'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!isConnected ? (
              <Button 
                onClick={handleGetQRCode} 
                disabled={isLoadingQR}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isLoadingQR ? 'Gerando...' : 'Conectar WhatsApp'}</span>
              </Button>
            ) : (
              <Button 
                onClick={handleDisconnect} 
                disabled={isDisconnecting}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <WifiOff className="w-4 h-4" />
                <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar'}</span>
              </Button>
            )}
          </div>
        </div>

        {(qrCode || isLoadingQR || qrError) && (
          <QRCodeDisplay
            qrCode={qrCode}
            isLoading={isLoadingQR}
            error={qrError}
            onRefresh={handleGetQRCode}
          />
        )}

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Como usar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Clique em "Conectar WhatsApp" para gerar o QR Code</li>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Vá em Configurações → Aparelhos conectados</li>
            <li>Escaneie o QR Code que aparecerá na tela</li>
            <li>Aguarde a confirmação da conexão</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvolutionApiSettings;
