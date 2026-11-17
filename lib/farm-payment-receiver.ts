import {cashReceiver, type CashReceiver} from './operations-cash-validation';

export const farmPaymentDestinations = [
  {id: 'primefield_account', label: 'Primefield Account'},
  {id: 'sales_and_procurement', label: 'Sales and Procurement'},
] as const;

export function farmPaymentReceiver(choice: unknown): CashReceiver | undefined {
  const destination = farmPaymentDestinations.find(option => choice === 'farm:' + option.id);
  if (destination) return {type: 'farm_destination', destination: destination.id};
  if (typeof choice !== 'string' || !choice.startsWith('farm_supervisor:')) return undefined;
  const result = cashReceiver.safeParse({type: 'farm_supervisor', period_id: choice.slice('farm_supervisor:'.length)});
  return result.success ? result.data : undefined;
}

export function isFarmReceiverChoice(choice: unknown) {
  return !!farmPaymentReceiver(choice);
}
