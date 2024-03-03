const modulename = 'WebServer:Cash';



/**
 * Returns the server log page
 * @param {object} ctx
 */
export default async function Cash(ctx) {
    const renderData = {
        headerTitle: 'Cash',
    };
    return ctx.utils.render('main/cash', renderData);
};
