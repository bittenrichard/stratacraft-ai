import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Download } from 'lucide-react';
import { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"

const ReportsView = () => {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 7),
    })
    const { toast } = useToast();

    const handleGenerateReport = () => {
        toast({
            title: "Gerando seu relatório...",
            description: "Esta funcionalidade será conectada a um serviço de geração de PDF no futuro."
        });
        // Lógica de geração de PDF seria chamada aqui
    };

    return (
        <div className="min-h-screen bg-gradient-subtle p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                    Relatórios
                </h1>
                <p className="text-muted-foreground">
                    Gere relatórios de performance consolidados com um clique.
                </p>
            </div>

            <Card className="max-w-md mx-auto bg-gradient-card border-border shadow-card">
                <CardHeader>
                    <CardTitle>Gerar Relatório de Performance</CardTitle>
                    <CardDescription>Selecione o período desejado para o seu relatório.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Período</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Escolha uma data</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleGenerateReport} className="w-full bg-gradient-primary">
                        <Download className="mr-2 h-4 w-4" />
                        Gerar e Baixar Relatório
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportsView;