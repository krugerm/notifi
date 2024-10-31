// src/components/ui/ConnectionStatus.tsx

interface ConnectionStatusProps {
    isConnected: boolean;
    browserInfo: BrowserInfo;
}

export const ConnectionStatus = ({ isConnected, browserInfo }: ConnectionStatusProps) => {
    const shortId = browserInfo.tabId.split('-')[2]; // Just show the random part

    return (
        <span className="text-sm flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
        {isConnected ? 'Connected' : 'Disconnected'}
        <span className="text-gray-500">
            ({browserInfo.browser} {browserInfo.deviceType} - {shortId})
        </span>
        </span>
    );
};
