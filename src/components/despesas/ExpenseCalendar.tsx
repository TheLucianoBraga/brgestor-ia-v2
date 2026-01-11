import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';

interface ExpenseCalendarProps {
  expenses: any[];
  isLoading: boolean;
}

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = ({ expenses, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Calendário de Vencimentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <div className="text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Calendário interativo em desenvolvimento</p>
            <p className="text-sm mt-2">Visualize todas as despesas por data</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
