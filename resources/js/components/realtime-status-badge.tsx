import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RealtimeConnectionStatus } from '@/hooks/use-work-orders-realtime';

interface Props {
    status: RealtimeConnectionStatus;
    onReconnect?: () => void;
}

export function RealtimeStatusBadge({ status, onReconnect }: Props) {
    if (status === 'connected') {
        return (
            <TooltipProvider delayDuration={150}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="outline"
                            className="h-10 cursor-default gap-2 rounded-md border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-600 transition-colors select-none dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                            <Wifi className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">En vivo</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Conectado al servidor WebSocket en tiempo real. Los
                        datos se actualizan automáticamente sin recargar la
                        página.
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (status === 'connecting') {
        return (
            <TooltipProvider delayDuration={150}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="outline"
                            className="h-10 cursor-default gap-2 rounded-md border-amber-500/20 bg-amber-500/10 px-3 text-xs font-medium text-amber-600 select-none dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                        >
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                            <span className="hidden sm:inline">
                                Conectando...
                            </span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Conectando al servidor WebSocket...
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        variant="outline"
                        onClick={onReconnect}
                        className="h-10 cursor-pointer gap-2 rounded-md border-destructive/20 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors select-none hover:bg-destructive/20 dark:border-destructive/30 dark:bg-destructive/15"
                    >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-destructive"></span>
                        <WifiOff className="h-3.5 w-3.5 shrink-0" />
                        <span className="hidden sm:inline">Desconectado</span>
                        <RefreshCw className="h-3 w-3 shrink-0 opacity-70" />
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    Sin conexión al servidor WebSocket. Haz clic para
                    reconectar.
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
