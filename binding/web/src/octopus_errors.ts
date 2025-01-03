//
// Copyright 2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import { PvError } from '@picovoice/web-utils';
import { PvStatus } from './types';

class OctopusError extends Error {
  private readonly _status: PvStatus;
  private readonly _shortMessage: string;
  private readonly _messageStack: string[];

  constructor(
    status: PvStatus,
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(OctopusError.errorToString(message, messageStack, pvError));
    this._status = status;
    this.name = 'OctopusError';
    this._shortMessage = message;
    this._messageStack = messageStack;
  }

  get status(): PvStatus {
    return this._status;
  }

  get shortMessage(): string {
    return this._shortMessage;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[],
    pvError: PvError | null = null
  ): string {
    let msg = initial;

    if (pvError) {
      const pvErrorMessage = pvError.getErrorString();
      if (pvErrorMessage.length > 0) {
        msg += `\nDetails: ${pvErrorMessage}`;
      }
    }

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce(
        (acc, value, index) => acc + '\n  [' + index + '] ' + value,
        ''
      )}`;
    }

    return msg;
  }
}

class OctopusOutOfMemoryError extends OctopusError {
  constructor(
    message: string,
    messageStack?: string[],
    pvError: PvError | null = null
  ) {
    super(PvStatus.OUT_OF_MEMORY, message, messageStack, pvError);
    this.name = 'OctopusOutOfMemoryError';
  }
}

class OctopusIOError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.IO_ERROR, message, messageStack, pvError);
    this.name = 'OctopusIOError';
  }
}

class OctopusInvalidArgumentError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.INVALID_ARGUMENT, message, messageStack, pvError);
    this.name = 'OctopusInvalidArgumentError';
  }
}

class OctopusStopIterationError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.STOP_ITERATION, message, messageStack, pvError);
    this.name = 'OctopusStopIterationError';
  }
}

class OctopusKeyError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.KEY_ERROR, message, messageStack, pvError);
    this.name = 'OctopusKeyError';
  }
}

class OctopusInvalidStateError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.INVALID_STATE, message, messageStack, pvError);
    this.name = 'OctopusInvalidStateError';
  }
}

class OctopusRuntimeError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.RUNTIME_ERROR, message, messageStack, pvError);
    this.name = 'OctopusRuntimeError';
  }
}

class OctopusActivationError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.ACTIVATION_ERROR, message, messageStack, pvError);
    this.name = 'OctopusActivationError';
  }
}

class OctopusActivationLimitReachedError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.ACTIVATION_LIMIT_REACHED, message, messageStack, pvError);
    this.name = 'OctopusActivationLimitReachedError';
  }
}

class OctopusActivationThrottledError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.ACTIVATION_THROTTLED, message, messageStack, pvError);
    this.name = 'OctopusActivationThrottledError';
  }
}

class OctopusActivationRefusedError extends OctopusError {
  constructor(
    message: string,
    messageStack: string[] = [],
    pvError: PvError | null = null
  ) {
    super(PvStatus.ACTIVATION_REFUSED, message, messageStack, pvError);
    this.name = 'OctopusActivationRefusedError';
  }
}

export {
  OctopusError,
  OctopusOutOfMemoryError,
  OctopusIOError,
  OctopusInvalidArgumentError,
  OctopusStopIterationError,
  OctopusKeyError,
  OctopusInvalidStateError,
  OctopusRuntimeError,
  OctopusActivationError,
  OctopusActivationLimitReachedError,
  OctopusActivationThrottledError,
  OctopusActivationRefusedError,
};

export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = [],
  pvError: PvError | null = null
): OctopusError {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      return new OctopusOutOfMemoryError(errorMessage, messageStack, pvError);
    case PvStatus.IO_ERROR:
      return new OctopusIOError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_ARGUMENT:
      return new OctopusInvalidArgumentError(
        errorMessage,
        messageStack,
        pvError
      );
    case PvStatus.STOP_ITERATION:
      return new OctopusStopIterationError(errorMessage, messageStack, pvError);
    case PvStatus.KEY_ERROR:
      return new OctopusKeyError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_STATE:
      return new OctopusInvalidStateError(errorMessage, messageStack, pvError);
    case PvStatus.RUNTIME_ERROR:
      return new OctopusRuntimeError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_ERROR:
      return new OctopusActivationError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      return new OctopusActivationLimitReachedError(
        errorMessage,
        messageStack,
        pvError
      );
    case PvStatus.ACTIVATION_THROTTLED:
      return new OctopusActivationThrottledError(
        errorMessage,
        messageStack,
        pvError
      );
    case PvStatus.ACTIVATION_REFUSED:
      return new OctopusActivationRefusedError(
        errorMessage,
        messageStack,
        pvError
      );
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      return new OctopusError(pvStatus, errorMessage);
  }
}
