const modulename = 'WebServer:VIP';



/**
 * Returns the server log page
 * @param {object} ctx
 */
export default async function Vip(ctx) {
    const renderData = {
        headerTitle: 'VIP',
    };
    return ctx.utils.render('main/vip', renderData);
};
