import { Injectable } from '@nestjs/common';

export interface AllocationResult {
  installments: bigint[];
  total: bigint;
}

@Injectable()
export class InstallmentAllocationPolicy {
  allocate(total: bigint, count: number): AllocationResult {
    if (count <= 0) {
      throw new Error('Count must be positive');
    }

    if (total <= 0n) {
      throw new Error('Total must be positive');
    }

    const baseAmount = total / BigInt(count);
    const remainder = total % BigInt(count);

    const installments: bigint[] = [];

    for (let i = 0; i < count - 1; i++) {
      installments.push(baseAmount);
    }

    installments.push(baseAmount + remainder);

    const sum = installments.reduce((a, b) => a + b, 0n);
    if (sum !== total) {
      throw new Error('Allocation sum does not match total');
    }

    return {
      installments,
      total,
    };
  }

  validateAllocation(installments: bigint[], expectedTotal: bigint): boolean {
    const sum = installments.reduce((a, b) => a + b, 0n);
    return sum === expectedTotal;
  }
}
