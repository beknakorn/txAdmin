const modulename = 'WebServer:PlayerLog';



/**
 * Returns the server log page
 * @param {object} ctx
 */
export default async function PlayerLog(ctx) {
    const renderData = {
        headerTitle: 'Player Log',
    };
    return ctx.utils.render('main/playerLog', renderData);
};
