const modulename = 'WebServer:AuthLogic';
import { z } from "zod";
import { convars } from '@core/globalData';
import consoleFactory from '@extras/console';
import TxAdmin from "@core/txAdmin";
const console = consoleFactory(modulename);


/**
 * Admin class to be used as ctx.admin
 */
export class AuthedAdmin {
    public readonly name: string;
    public readonly isMaster: boolean;
    public readonly permissions: string[];
    public readonly isTempPassword: boolean;
    public readonly profilePicture: string | undefined;
    public readonly csrfToken?: string;
    readonly #txAdmin: TxAdmin;

    constructor(txAdmin: TxAdmin, vaultAdmin: any, csrfToken?: string) {
        this.#txAdmin = txAdmin;
        this.name = vaultAdmin.name;
        this.isMaster = vaultAdmin.master;
        this.permissions = vaultAdmin.permissions;
        this.isTempPassword = (typeof vaultAdmin.password_temporary !== 'undefined');
        this.csrfToken = csrfToken;

        const cachedPfp = txAdmin.persistentCache.get(`admin:picture:${vaultAdmin.name}`);
        this.profilePicture = typeof cachedPfp === 'string' ? cachedPfp : undefined;
    }

    /**
     * Logs an action to the console and the action logger
     */
    public logAction(action: string): void {
        this.#txAdmin.logger.admin.write(this.name, action);
    };

    /**
     * Logs a command to the console and the action logger
     */
    public logCommand(data: string): void {
        this.#txAdmin.logger.admin.write(this.name, data, 'command');
    };

    /**
     * Returns if admin has permission or not - no message is printed
     */
    hasPermission(perm: string): boolean {
        try {
            if (perm === 'master') {
                return this.isMaster;
            }
            return (
                this.isMaster
                || this.permissions.includes('all_permissions')
                || this.permissions.includes(perm)
            );
        } catch (error) {
            console.verbose.warn(`Error validating permission '${perm}' denied.`);
            return false;
        }
    }

    /**
     * Test for a permission and prints warn if test fails and verbose
     */
    testPermission(perm: string, fromCtx: string): boolean {
        if (!this.hasPermission(perm)) {
            console.verbose.warn(`[${this.name}] Permission '${perm}' denied.`, fromCtx);
            return false;
        }
        return true;
    }
}

export type AuthedAdminType = InstanceType<typeof AuthedAdmin>;


/**
 * Return type helper - null reason indicates nothing to print
 */
type AuthLogicReturnType = {
    success: true,
    admin: AuthedAdmin;
} | {
    success: false;
    rejectReason?: string;
};
const successResp = (txAdmin: TxAdmin, vaultAdmin: any, csrfToken?: string) => ({
    success: true,
    admin: new AuthedAdmin(txAdmin, vaultAdmin, csrfToken),
} as const)
const failResp = (reason?: string) => ({
    success: false,
    rejectReason: reason,
} as const)


/**
 * ZOD schemas for session auth
 */
const validPassSessAuthSchema = z.object({
    type: z.literal('password'),
    username: z.string(),
    csrfToken: z.string(),
    expiresAt: z.literal(false),
    password_hash: z.string(),
});
export type PassSessAuthType = z.infer<typeof validPassSessAuthSchema>;

const validCfxreSessAuthSchema = z.object({
    type: z.literal('cfxre'),
    username: z.string(),
    csrfToken: z.string(),
    expiresAt: z.number(),
    identifier: z.string(),
});
export type CfxreSessAuthType = z.infer<typeof validCfxreSessAuthSchema>;

const validSessAuthSchema = z.discriminatedUnion('type', [
    validPassSessAuthSchema,
    validCfxreSessAuthSchema
]);


/**
 * Autentication logic used in both websocket and webserver, for both web and nui requests.
 */
export const checkRequestAuth = (
    txAdmin: TxAdmin,
    reqHeader: { [key: string]: unknown },
    reqIP: string,
    sess: any,
) => {
    return typeof reqHeader['x-txadmin-token'] === 'string'
        ? nuiAuthLogic(txAdmin, reqIP, reqHeader)
        : normalAuthLogic(txAdmin, sess);
}


/**
 * Autentication logic used in both websocket and webserver
 */
export const normalAuthLogic = (
    txAdmin: TxAdmin,
    sess: any
): AuthLogicReturnType => {
    try {
        // Parsing session auth
        const validationResult = validSessAuthSchema.safeParse(sess?.auth);
        if (!validationResult.success) {
            return failResp();
        }
        const sessAuth = validationResult.data;

        // Checking for expiration
        if (sessAuth.expiresAt !== false && Date.now() > sessAuth.expiresAt) {
            return failResp(`Expired session from '${sess.auth.username}'.`);
        }

        // Searching for admin in AdminVault
        const vaultAdmin = txAdmin.adminVault.getAdminByName(sessAuth.username);
        if (!vaultAdmin) {
            return failResp(`Admin '${sessAuth.username}' not found.`);
        }

        // Checking for auth types
        if (sessAuth.type === 'password') {
            if (vaultAdmin.password_hash !== sessAuth.password_hash) {
                return failResp(`Password hash doesn't match for '${sessAuth.username}'.`);
            }
            return successResp(txAdmin, vaultAdmin, sessAuth.csrfToken);
        } else if (sessAuth.type === 'cfxre') {
            if (
                typeof vaultAdmin.providers.citizenfx !== 'object'
                || vaultAdmin.providers.citizenfx.identifier !== sessAuth.identifier
            ) {
                return failResp(`Cfxre identifier doesn't match for '${sessAuth.username}'.`);
            }
            return successResp(txAdmin, vaultAdmin, sessAuth.csrfToken);
        } else {
            return failResp('Invalid auth type.');
        }
    } catch (error) {
        console.debug(`Error validating session data: ${(error as Error).message}`);
        return failResp('Error validating session data.');
    }
};


/**
 * Autentication & authorization logic used in for nui requests
 */
export const nuiAuthLogic = (
    txAdmin: TxAdmin,
    reqIP: string,
    reqHeader: { [key: string]: unknown }
): AuthLogicReturnType => {
    try {
        // Check sus IPs
        if (
            !convars.loopbackInterfaces.includes(reqIP)
            && !convars.isZapHosting
            && !txAdmin.webServer.config.disableNuiSourceCheck
        ) {
            console.verbose.warn(`NUI Auth Failed: reqIP "${reqIP}" not in ${JSON.stringify(convars.loopbackInterfaces)}.`);
            return failResp('Invalid Request: source');
        }

        // Check missing headers
        if (typeof reqHeader['x-txadmin-token'] !== 'string') {
            return failResp('Invalid Request: token header');
        }
        if (typeof reqHeader['x-txadmin-identifiers'] !== 'string') {
            return failResp('Invalid Request: identifiers header');
        }

        // Check token value
        if (reqHeader['x-txadmin-token'] !== txAdmin.webServer.luaComToken) {
            console.verbose.warn(`NUI Auth Failed: token received '${reqHeader['x-txadmin-token']}' !== expected '${txAdmin.webServer.luaComToken}'.`);
            return failResp('Unauthorized: token value');
        }

        // Check identifier array
        const identifiers = reqHeader['x-txadmin-identifiers']
            .split(',')
            .filter((i) => i.length);
        if (!identifiers.length) {
            return failResp('Unauthorized: empty identifier array');
        }

        // Searching for admin in AdminVault
        const vaultAdmin = txAdmin.adminVault.getAdminByIdentifiers(identifiers);
        if (!vaultAdmin) {
            //this one is handled differently in resource/menu/client/cl_base.lua
            return failResp('admin_not_found');
        }
        return successResp(txAdmin, vaultAdmin, undefined);
    } catch (error) {
        console.debug(`Error validating session data: ${(error as Error).message}`);
        return failResp('Error validating auth header');
    }
};